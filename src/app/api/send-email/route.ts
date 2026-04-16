import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { BrevoClient } from "@getbrevo/brevo";
import { filterValidUsers, DAILY_EMAIL_LIMIT } from "@/lib/campaignService";
import { DailyEmailStatsDoc } from "@/lib/firestoreTypes";
import type { User } from "@/lib/types";

const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY! });

interface SendEmailBody {
  emails?: string[];
  subject: string;
  content?: string;
  htmlContent?: string;
  sendToAll?: boolean;
  fromName?: string;
}

interface SendResult {
  email: string;
  messageId?: string;
  error?: string;
  success: boolean;
}

// POST /api/send-email — ad-hoc sends (selected users or quick blast to all)
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as SendEmailBody;
    const {
      emails,
      subject,
      content,
      htmlContent,
      sendToAll = false,
      fromName,
    } = body;

    if (!subject?.trim() || (!content?.trim() && !htmlContent?.trim())) {
      return NextResponse.json(
        { message: "Subject and content are required" },
        { status: 400 }
      );
    }

    const senderName =
      fromName?.trim() || process.env.FROM_NAME || "KharagEdition";

    // ── Check daily quota ─────────────────────────────────────────────────
    const today = new Date().toISOString().split("T")[0];
    const statsDoc = await db.collection("emailStats").doc(today).get();
    const emailsSentToday = statsDoc.exists
      ? (statsDoc.data() as DailyEmailStatsDoc).emailsSent ?? 0
      : 0;
    const remainingQuota = Math.max(0, DAILY_EMAIL_LIMIT - emailsSentToday);

    if (remainingQuota === 0) {
      return NextResponse.json(
        {
          message: `Daily limit (${DAILY_EMAIL_LIMIT}) reached. Emails sent today: ${emailsSentToday}.`,
          remainingQuota: 0,
          emailsSentToday,
        },
        { status: 429 }
      );
    }

    // ── Resolve recipient list ────────────────────────────────────────────
    let recipients: User[] = [];

    const usersSnap = await db.collection("users").get();
    const allUsers: User[] = usersSnap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        displayName: (d.displayName as string) ?? "",
        email: (d.email as string) ?? "",
        provider: (d.provider as string) ?? "",
        createdAt: "",
        lastLogin: "",
        photoUrl: d.photoUrl as string | undefined,
        subscriptionType: d.subscriptionType as string | undefined,
      };
    });

    if (sendToAll) {
      recipients = filterValidUsers(allUsers);
    } else {
      if (!emails || emails.length === 0) {
        return NextResponse.json(
          { message: "No email addresses provided" },
          { status: 400 }
        );
      }
      const emailSet = new Set(emails.map((e) => e.toLowerCase()));
      recipients = filterValidUsers(
        allUsers.filter((u) => emailSet.has(u.email.toLowerCase()))
      );

      // Include emails not matched to a user (external addresses)
      const matchedEmails = new Set(recipients.map((u) => u.email.toLowerCase()));
      emails.forEach((e) => {
        if (!matchedEmails.has(e.toLowerCase()) && e.includes("@")) {
          recipients.push({
            id: `ext_${Date.now()}_${Math.random()}`,
            email: e,
            displayName: e.split("@")[0],
            provider: "external",
            createdAt: "",
            lastLogin: "",
          });
        }
      });
    }

    recipients = recipients.slice(0, remainingQuota);

    if (recipients.length === 0) {
      return NextResponse.json(
        { message: "No valid recipients found" },
        { status: 400 }
      );
    }

    const emailHtml =
      htmlContent ||
      `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
        <h2>Hello {{params.displayName}}!</h2>
        <div>${content!.replace(/\n/g, "<br>")}</div>
        <p style="font-size:12px;color:#666;margin-top:24px;">
          This email was sent from ${senderName}
        </p>
      </div>`;

    // ── Send ──────────────────────────────────────────────────────────────
    const results: SendResult[] = await Promise.all(
      recipients.map(async (user): Promise<SendResult> => {
        try {
          const res = await brevo.transactionalEmails.sendTransacEmail({
            sender: { email: process.env.FROM_EMAIL!, name: senderName },
            to: [{ email: user.email }],
            subject: subject.trim(),
            htmlContent: emailHtml,
            params: {
              displayName: user.displayName || user.email.split("@")[0],
              appName: senderName,
            },
          });
          return {
            email: user.email,
            messageId: (res as { messageId?: string }).messageId,
            success: true,
          };
        } catch (err) {
          return {
            email: user.email,
            error: err instanceof Error ? err.message : "Send failed",
            success: false,
          };
        }
      })
    );

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    // ── Update daily stats ────────────────────────────────────────────────
    await db.collection("emailStats").doc(today).set(
      {
        date: today,
        emailsSent: FieldValue.increment(successCount),
        lastUpdated: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({
      message: `${successCount} sent successfully, ${failedCount} failed`,
      totalProcessed: results.length,
      successCount,
      failedCount,
      remainingQuota: remainingQuota - successCount,
      emailsSentToday: emailsSentToday + successCount,
      results,
    });
  } catch (err) {
    const error = err as { message?: string; response?: { status?: number } };
    if (error.response?.status === 401) {
      return NextResponse.json({ message: "Invalid Brevo API key" }, { status: 401 });
    }
    if (error.response?.status === 403) {
      return NextResponse.json(
        { message: "Brevo account suspended or sender not verified" },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { message: "Failed to send emails", error: error.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

// GET /api/send-email — daily quota summary
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const date =
      searchParams.get("date") ?? new Date().toISOString().split("T")[0];

    const doc = await db.collection("emailStats").doc(date).get();
    const emailsSent = doc.exists
      ? (doc.data() as DailyEmailStatsDoc).emailsSent ?? 0
      : 0;

    return NextResponse.json({
      date,
      emailsSent,
      remainingQuota: Math.max(0, DAILY_EMAIL_LIMIT - emailsSent),
      dailyLimit: DAILY_EMAIL_LIMIT,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { message: "Failed to fetch email stats", error: message },
      { status: 500 }
    );
  }
}
