// src/app/api/send-email/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../lib/firebase-admin";
import { User } from "../../../lib/types";
import * as brevo from "@getbrevo/brevo";

// Initialize Brevo API
const apiInstance = new brevo.TransactionalEmailsApi();
const emailLimit = 87;
apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY!
);

interface EmailTrackingRecord {
  userId: string;
  email: string;
  subject: string;
  sentAt: Date;
  messageId?: string;
  campaignId?: string;
}

interface DailyEmailStats {
  date: string;
  emailsSent: number;
  lastUpdated: Date;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      // For individual emails (from dashboard selection)
      emails, // Array of email addresses
      subject,
      content, // Plain text content from dashboard

      // For bulk emails (send to all users)
      htmlContent, // Rich HTML content for bulk emails
      campaignId,
      maxEmailsPerDay = emailLimit,
      skipDuplicates = true,
      sendToAll = false, // Flag to determine if sending to all users or just selected ones
    } = body;

    if (!subject || (!content && !htmlContent)) {
      return NextResponse.json(
        { message: "Subject and content are required" },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split("T")[0];

    // Check daily email quota
    const dailyStatsDoc = await db.collection("emailStats").doc(today).get();
    const dailyStats: DailyEmailStats = dailyStatsDoc.exists
      ? (dailyStatsDoc.data() as DailyEmailStats)
      : { date: today, emailsSent: 0, lastUpdated: new Date() };

    const remainingQuota = maxEmailsPerDay - dailyStats.emailsSent;

    if (remainingQuota <= 0) {
      return NextResponse.json(
        {
          message: `Daily email quota (${maxEmailsPerDay}) exceeded. Emails sent today: ${dailyStats.emailsSent}`,
          remainingQuota: 0,
          emailsSentToday: dailyStats.emailsSent,
        },
        { status: 429 }
      );
    }

    let finalUsersList: User[] = [];

    if (sendToAll) {
      // Bulk email to all users
      const usersSnapshot = await db.collection("users").get();
      const allUsers: User[] = usersSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as User)
      );

      const validatedUsers = allUsers.filter(
        (user) => user.email && user.email.includes("@")
      );

      if (validatedUsers.length === 0) {
        return NextResponse.json(
          { message: "No valid email addresses found" },
          { status: 400 }
        );
      }

      finalUsersList = validatedUsers;

      // Filter out duplicates if skipDuplicates is enabled
      if (skipDuplicates) {
        const emailTrackingQuery = db
          .collection("emailTracking")
          .where("sentAt", ">=", new Date(`${today}T00:00:00Z`))
          .where("sentAt", "<", new Date(`${today}T23:59:59Z`));

        const trackingSnapshot = campaignId
          ? await emailTrackingQuery.where("campaignId", "==", campaignId).get()
          : await emailTrackingQuery.where("subject", "==", subject).get();

        const alreadySentEmails = new Set(
          trackingSnapshot.docs.map((doc) => doc.data().email)
        );

        finalUsersList = validatedUsers.filter(
          (user) => !alreadySentEmails.has(user.email)
        );

        console.log(
          `Filtered out ${
            validatedUsers.length - finalUsersList.length
          } users who already received this email today`
        );
      }
    } else {
      // Individual emails to selected users
      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return NextResponse.json(
          { message: "No email addresses provided" },
          { status: 400 }
        );
      }

      // Get user data for the selected emails
      const usersSnapshot = await db.collection("users").get();
      const allUsers: User[] = usersSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as User)
      );

      finalUsersList = allUsers.filter(
        (user) =>
          emails.includes(user.email) && user.email && user.email.includes("@")
      );

      // If some emails don't have user records, create temporary user objects
      const existingEmails = new Set(finalUsersList.map((user) => user.email));
      const missingEmails = emails.filter(
        (email: string) => !existingEmails.has(email)
      );

      missingEmails.forEach((email: string) => {
        finalUsersList.push({
          id: `temp_${Date.now()}_${Math.random()}`,
          email,
          displayName: email.split("@")[0],
          provider: "unknown",
          subscription: "unknown",
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        });
      });
    }

    // Limit to remaining quota
    finalUsersList = finalUsersList.slice(0, remainingQuota);

    if (finalUsersList.length === 0) {
      return NextResponse.json(
        {
          message:
            skipDuplicates && sendToAll
              ? "All users have already received this email today"
              : "No valid recipients found",
          remainingQuota,
          emailsSentToday: dailyStats.emailsSent,
        },
        { status: 200 }
      );
    }

    console.log(
      `Sending emails to ${finalUsersList.length} recipients (remaining quota: ${remainingQuota})...`
    );

    // Prepare email content
    const emailContent =
      htmlContent ||
      `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #2563eb;">Hello {{params.displayName}}!</h2>
      <div style="margin: 20px 0;">
        ${content.replace(/\n/g, "<br>")}
      </div>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      <p style="font-size: 12px; color: #6b7280;">
        This email was sent from ${process.env.APP_NAME || "Your App"}
      </p>
    </div>`;

    // Send individual emails
    const emailPromises = finalUsersList.map(async (user) => {
      const sendSmtpEmail = new brevo.SendSmtpEmail();

      sendSmtpEmail.sender = {
        email: process.env.FROM_EMAIL!,
        name: process.env.FROM_NAME || "KharagEdition",
      };

      sendSmtpEmail.to = [{ email: user.email }];
      sendSmtpEmail.subject = subject;
      sendSmtpEmail.htmlContent = emailContent;
      sendSmtpEmail.tags = [sendToAll ? "bulk-email" : "selected-users"];

      sendSmtpEmail.params = {
        displayName: user.displayName || user.email.split("@")[0],
        appName: process.env.APP_NAME || "",
      };

      try {
        const response = await apiInstance.sendTransacEmail(sendSmtpEmail);

        // Track successful email in Firestore
        const trackingRecord: EmailTrackingRecord = {
          userId: user.id,
          email: user.email,
          subject: subject,
          sentAt: new Date(),
          messageId: response.body.messageId,
          ...(campaignId && { campaignId }),
        };

        await db.collection("emailTracking").add(trackingRecord);

        return {
          email: user.email,
          messageId: response.body.messageId,
          success: true,
        };
      } catch (emailError: any) {
        console.error(
          `Failed to send email to ${user.email}:`,
          emailError.message
        );
        return {
          email: user.email,
          error: emailError.message,
          success: false,
        };
      }
    });

    // Wait for all emails to be sent
    const results = await Promise.all(emailPromises);
    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    // Update daily stats
    const newEmailsSent = dailyStats.emailsSent + successCount;
    await db.collection("emailStats").doc(today).set({
      date: today,
      emailsSent: newEmailsSent,
      lastUpdated: new Date(),
    });

    console.log(
      `Successfully sent ${successCount} emails, ${failedCount} failed`
    );
    console.log(`Total emails sent today: ${newEmailsSent}/${maxEmailsPerDay}`);

    return NextResponse.json({
      message: `Emails processed: ${successCount} sent successfully, ${failedCount} failed`,
      totalProcessed: results.length,
      successCount,
      failedCount,
      remainingQuota: maxEmailsPerDay - newEmailsSent,
      emailsSentToday: newEmailsSent,
      results,
    });
  } catch (error: any) {
    console.error("Error Details:", {
      message: error.message,
      response: error.response?.body,
      stack: error.stack,
    });

    // Handle specific Brevo errors
    if (error.response?.status === 401) {
      return NextResponse.json(
        { message: "Invalid Brevo API key" },
        { status: 401 }
      );
    }

    if (error.response?.status === 403) {
      return NextResponse.json(
        { message: "Brevo account suspended or sender not verified" },
        { status: 403 }
      );
    }

    if (error.response?.status === 400) {
      return NextResponse.json(
        { message: "Invalid email data or malformed request" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        message: "Failed to send emails",
        error: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check email stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date =
      searchParams.get("date") || new Date().toISOString().split("T")[0];

    const dailyStatsDoc = await db.collection("emailStats").doc(date).get();
    const dailyStats = dailyStatsDoc.exists
      ? (dailyStatsDoc.data() as DailyEmailStats)
      : { date, emailsSent: 0, lastUpdated: new Date() };

    // Get recent email tracking records for the date
    const trackingSnapshot = await db
      .collection("emailTracking")
      .where("sentAt", ">=", new Date(`${date}T00:00:00Z`))
      .where("sentAt", "<", new Date(`${date}T23:59:59Z`))
      .orderBy("sentAt", "desc")
      .limit(50)
      .get();

    const recentEmails = trackingSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      sentAt: doc.data().sentAt.toDate().toISOString(),
    }));

    return NextResponse.json({
      date,
      emailsSent: dailyStats.emailsSent,
      remainingQuota: emailLimit - (dailyStats.emailsSent || 0),
      recentEmails,
      lastUpdated: dailyStats.lastUpdated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: "Failed to fetch email stats", error: error.message },
      { status: 500 }
    );
  }
}
