import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { DailyEmailStatsDoc } from "@/lib/firestoreTypes";
import { DAILY_EMAIL_LIMIT } from "@/lib/campaignService";

// GET /api/email-stats?date=YYYY-MM-DD  (defaults to today)
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const date =
      searchParams.get("date") ?? new Date().toISOString().split("T")[0];

    const doc = await db.collection("emailStats").doc(date).get();
    const emailsSent = doc.exists
      ? (doc.data() as DailyEmailStatsDoc).emailsSent ?? 0
      : 0;
    const lastUpdatedTs = doc.exists
      ? (doc.data() as DailyEmailStatsDoc).lastUpdated
      : undefined;

    return NextResponse.json({
      date,
      emailsSent,
      remainingQuota: Math.max(0, DAILY_EMAIL_LIMIT - emailsSent),
      dailyLimit: DAILY_EMAIL_LIMIT,
      lastUpdated: lastUpdatedTs?.toDate?.()?.toISOString() ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { message: "Failed to fetch email stats", error: message },
      { status: 500 }
    );
  }
}
