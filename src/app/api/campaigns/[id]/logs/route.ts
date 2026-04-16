import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { EmailLogDoc, docToEmailLog } from "@/lib/firestoreTypes";
import type { EmailLogStatus } from "@/lib/types";

type RouteProps = { params: Promise<{ id: string }> };

const VALID_STATUSES: EmailLogStatus[] = ["sent", "failed"];

// GET /api/campaigns/[id]/logs?status=sent|failed&limit=100
export async function GET(
  request: NextRequest,
  props: RouteProps
): Promise<NextResponse> {
  try {
    const { id } = await props.params;
    const { searchParams } = new URL(request.url);

    const statusParam = searchParams.get("status");
    const status: EmailLogStatus | null =
      statusParam && VALID_STATUSES.includes(statusParam as EmailLogStatus)
        ? (statusParam as EmailLogStatus)
        : null;

    const limit = Math.min(
      500,
      Math.max(1, parseInt(searchParams.get("limit") ?? "100", 10))
    );

    let query = db
      .collection("emailLogs")
      .where("campaignVersionId", "==", id);

    if (status) {
      query = query.where("status", "==", status);
    }

    const snap = await query.orderBy("sentAt", "desc").limit(limit).get();

    const logs = snap.docs.map((doc) =>
      docToEmailLog(doc.id, doc.data() as EmailLogDoc)
    );

    return NextResponse.json({ logs, total: logs.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { message: "Failed to fetch campaign logs", error: message },
      { status: 500 }
    );
  }
}
