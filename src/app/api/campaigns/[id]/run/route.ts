import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { BrevoClient } from "@getbrevo/brevo";
import {
  DAILY_EMAIL_LIMIT,
  SEND_BATCH_SIZE,
  getDailyRemainingQuota,
  filterValidUsers,
  filterRemainingUsers,
  selectSendBatch,
  normalisedEmail,
} from "@/lib/campaignService";
import {
  CampaignVersionDoc,
  DailyEmailStatsDoc,
  EmailLogDoc,
} from "@/lib/firestoreTypes";
import type { User } from "@/lib/types";

const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY! });

type RouteProps = { params: Promise<{ id: string }> };

// POST /api/campaigns/[id]/run — run or resume the campaign
export async function POST(
  _request: NextRequest,
  props: RouteProps
): Promise<NextResponse> {
  const { id } = await props.params;

  // ── 1. Load campaign ────────────────────────────────────────────────────
  const campaignDoc = await db.collection("campaignVersions").doc(id).get();
  if (!campaignDoc.exists) {
    return NextResponse.json({ message: "Campaign not found" }, { status: 404 });
  }

  const campaign = campaignDoc.data() as CampaignVersionDoc;

  if (campaign.status === "completed") {
    return NextResponse.json(
      { message: "Campaign is already completed — all users have been emailed." },
      { status: 400 }
    );
  }
  if (campaign.status === "active") {
    return NextResponse.json(
      { message: "Campaign is currently running. Please wait." },
      { status: 400 }
    );
  }

  // ── 2. Check daily Brevo quota ──────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];
  const statsSnap = await db.collection("emailStats").doc(today).get();
  const emailsSentToday = statsSnap.exists
    ? (statsSnap.data() as DailyEmailStatsDoc).emailsSent ?? 0
    : 0;

  const remainingQuota = getDailyRemainingQuota(emailsSentToday);
  if (remainingQuota === 0) {
    return NextResponse.json(
      {
        message: `Daily Brevo limit (${DAILY_EMAIL_LIMIT}) reached. Sent today: ${emailsSentToday}. Try again tomorrow.`,
        emailsSentToday,
        remainingQuota: 0,
      },
      { status: 429 }
    );
  }

  // ── 3. Fetch users in stable order (createdAt asc) ──────────────────────
  const usersSnap = await db
    .collection("users")
    .orderBy("createdAt", "asc")
    .get();

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

  const validUsers = filterValidUsers(allUsers);
  if (validUsers.length === 0) {
    return NextResponse.json(
      { message: "No users with valid email addresses found" },
      { status: 400 }
    );
  }

  // ── 4. Find already-sent emails for this campaign (resume logic) ────────
  const logsSnap = await db
    .collection("emailLogs")
    .where("campaignVersionId", "==", id)
    .where("status", "==", "sent")
    .get();

  const alreadySent = new Set(
    logsSnap.docs.map((d) => normalisedEmail((d.data() as EmailLogDoc).email))
  );

  // ── 5. Filter remaining users ───────────────────────────────────────────
  const remainingUsers = filterRemainingUsers(validUsers, alreadySent);

  if (remainingUsers.length === 0) {
    await db.collection("campaignVersions").doc(id).update({
      status: "completed",
      completedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({
      message: "Campaign completed — every user has already received this email.",
      sentThisRun: 0,
      remainingUsers: 0,
    });
  }

  // ── 6. Slice to daily quota ─────────────────────────────────────────────
  const batch = selectSendBatch(remainingUsers, remainingQuota);
  const isFirstRun = campaign.totalUsers === 0;

  // Mark as active before sending
  await db.collection("campaignVersions").doc(id).update({
    status: "active",
    ...(isFirstRun && {
      totalUsers: validUsers.length,
      startedAt: FieldValue.serverTimestamp(),
    }),
  });

  // ── 7. Send in chunks + write logs per chunk ────────────────────────────
  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < batch.length; i += SEND_BATCH_SIZE) {
    const chunk = batch.slice(i, i + SEND_BATCH_SIZE);

    const results = await Promise.allSettled(
      chunk.map((user) =>
        brevo.transactionalEmails.sendTransacEmail({
          sender: { email: process.env.FROM_EMAIL!, name: campaign.fromName },
          to: [{ email: user.email }],
          subject: campaign.subject,
          htmlContent: campaign.htmlContent,
          tags: [`campaign-${id}`, campaign.category],
          params: {
            displayName: user.displayName || user.email.split("@")[0],
            appName: campaign.fromName,
          },
        })
      )
    );

    // Batch write email logs for this chunk
    const firestoreBatch = db.batch();
    results.forEach((result, idx) => {
      const user = chunk[idx];
      const logRef = db.collection("emailLogs").doc();

      if (result.status === "fulfilled") {
        successCount++;
        const logDoc: Omit<EmailLogDoc, "sentAt"> & { sentAt: ReturnType<typeof FieldValue.serverTimestamp> } = {
          campaignVersionId: id,
          userId: user.id,
          email: user.email,
          status: "sent",
          messageId:
            (result.value as { messageId?: string }).messageId ?? undefined,
          sentAt: FieldValue.serverTimestamp(),
        };
        firestoreBatch.set(logRef, logDoc);
      } else {
        failedCount++;
        const errorMessage =
          result.reason instanceof Error
            ? result.reason.message
            : "Unknown send error";
        const logDoc: Omit<EmailLogDoc, "sentAt"> & { sentAt: ReturnType<typeof FieldValue.serverTimestamp> } = {
          campaignVersionId: id,
          userId: user.id,
          email: user.email,
          status: "failed",
          error: errorMessage,
          sentAt: FieldValue.serverTimestamp(),
        };
        firestoreBatch.set(logRef, logDoc);
      }
    });

    await firestoreBatch.commit();
  }

  // ── 8. Update campaign counters + final status ──────────────────────────
  const hasMore = remainingUsers.length > batch.length;
  await db.collection("campaignVersions").doc(id).update({
    status: hasMore ? "paused" : "completed",
    sentCount: FieldValue.increment(successCount),
    failedCount: FieldValue.increment(failedCount),
    ...(isFirstRun && { totalUsers: validUsers.length }),
    ...(!hasMore && { completedAt: FieldValue.serverTimestamp() }),
  });

  // ── 9. Update global daily stats ────────────────────────────────────────
  await db.collection("emailStats").doc(today).set(
    {
      date: today,
      emailsSent: FieldValue.increment(successCount),
      lastUpdated: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const remaining = remainingUsers.length - batch.length;
  return NextResponse.json({
    message: hasMore
      ? `Sent ${successCount} emails today. ${remaining} user${remaining !== 1 ? "s" : ""} remaining — run again tomorrow to continue.`
      : `Campaign completed! Sent ${successCount} emails to all remaining users.`,
    sentThisRun: successCount,
    failedThisRun: failedCount,
    remainingUsers: remaining,
    emailsSentToday: emailsSentToday + successCount,
    remainingQuota: remainingQuota - successCount,
    campaignStatus: hasMore ? "paused" : "completed",
  });
}
