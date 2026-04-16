import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { CampaignVersionDoc, docToCampaignVersion } from "@/lib/firestoreTypes";

type RouteProps = { params: Promise<{ id: string }> };

// GET /api/campaigns/[id]
export async function GET(
  _request: NextRequest,
  props: RouteProps
): Promise<NextResponse> {
  try {
    const { id } = await props.params;
    const doc = await db.collection("campaignVersions").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ message: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({
      campaign: docToCampaignVersion(doc.id, doc.data() as CampaignVersionDoc),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { message: "Failed to fetch campaign", error: message },
      { status: 500 }
    );
  }
}

// PATCH /api/campaigns/[id] — update content (draft or paused campaigns only)
export async function PATCH(
  request: NextRequest,
  props: RouteProps
): Promise<NextResponse> {
  try {
    const { id } = await props.params;
    const doc = await db.collection("campaignVersions").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ message: "Campaign not found" }, { status: 404 });
    }

    const current = doc.data() as CampaignVersionDoc;
    if (current.status === "active" || current.status === "completed") {
      return NextResponse.json(
        { message: `Cannot edit a campaign with status "${current.status}"` },
        { status: 400 }
      );
    }

    const body = (await request.json()) as Partial<{
      subject: string;
      htmlContent: string;
      fromName: string;
    }>;

    const updates: Record<string, string> = {};
    if (typeof body.subject === "string" && body.subject.trim()) {
      updates.subject = body.subject.trim();
    }
    if (typeof body.htmlContent === "string" && body.htmlContent.trim()) {
      updates.htmlContent = body.htmlContent.trim();
    }
    if (typeof body.fromName === "string" && body.fromName.trim()) {
      updates.fromName = body.fromName.trim();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { message: "No valid fields to update (subject, htmlContent, fromName)" },
        { status: 400 }
      );
    }

    await db.collection("campaignVersions").doc(id).update(updates);

    return NextResponse.json({ message: "Campaign updated successfully" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { message: "Failed to update campaign", error: message },
      { status: 500 }
    );
  }
}

// DELETE /api/campaigns/[id] — remove draft campaigns only
export async function DELETE(
  _request: NextRequest,
  props: RouteProps
): Promise<NextResponse> {
  try {
    const { id } = await props.params;
    const doc = await db.collection("campaignVersions").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ message: "Campaign not found" }, { status: 404 });
    }

    const current = doc.data() as CampaignVersionDoc;
    if (current.status !== "draft") {
      return NextResponse.json(
        { message: "Only draft campaigns can be deleted" },
        { status: 400 }
      );
    }

    await db.collection("campaignVersions").doc(id).delete();

    return NextResponse.json({ message: "Campaign deleted" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { message: "Failed to delete campaign", error: message },
      { status: 500 }
    );
  }
}
