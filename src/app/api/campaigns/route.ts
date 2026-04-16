import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import {
  validateCampaignInput,
  VALID_CATEGORIES,
} from "@/lib/campaignService";
import {
  CampaignVersionDoc,
  docToCampaignVersion,
} from "@/lib/firestoreTypes";
import type { CampaignCategory } from "@/lib/types";

// GET /api/campaigns — list all campaign versions, newest first
export async function GET(): Promise<NextResponse> {
  try {
    const snapshot = await db
      .collection("campaignVersions")
      .orderBy("createdAt", "desc")
      .get();

    const campaigns = snapshot.docs.map((doc) =>
      docToCampaignVersion(doc.id, doc.data() as CampaignVersionDoc)
    );

    return NextResponse.json({ campaigns });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { message: "Failed to fetch campaigns", error: message },
      { status: 500 }
    );
  }
}

// POST /api/campaigns — create a new campaign version
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as Record<string, string>;
    const { appVersion, category, subject, htmlContent, fromName } = body;

    const validationError = validateCampaignInput({
      appVersion,
      category,
      subject,
      htmlContent,
      fromName,
    });
    if (validationError) {
      return NextResponse.json(
        { message: validationError.message, field: validationError.field },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.includes(category as CampaignCategory)) {
      return NextResponse.json(
        {
          message: `category must be one of: ${VALID_CATEGORIES.join(", ")}`,
          field: "category",
        },
        { status: 400 }
      );
    }

    // Enforce (appVersion, category) uniqueness within this Firebase project
    const duplicate = await db
      .collection("campaignVersions")
      .where("appVersion", "==", appVersion.trim())
      .where("category", "==", category)
      .limit(1)
      .get();

    if (!duplicate.empty) {
      return NextResponse.json(
        {
          message: `A campaign for v${appVersion.trim()} (${category}) already exists. Each version + category combination must be unique.`,
          field: "appVersion",
        },
        { status: 409 }
      );
    }

    const now = new Date();
    const docRef = await db.collection("campaignVersions").add({
      appVersion: appVersion.trim(),
      category: category as CampaignCategory,
      subject: subject.trim(),
      htmlContent: htmlContent.trim(),
      fromName: fromName.trim(),
      status: "draft",
      totalUsers: 0,
      sentCount: 0,
      failedCount: 0,
      createdAt: now,
    });

    return NextResponse.json(
      {
        message: "Campaign created successfully",
        campaign: {
          id: docRef.id,
          appVersion: appVersion.trim(),
          category,
          subject: subject.trim(),
          htmlContent: htmlContent.trim(),
          fromName: fromName.trim(),
          status: "draft",
          totalUsers: 0,
          sentCount: 0,
          failedCount: 0,
          createdAt: now.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { message: "Failed to create campaign", error: message },
      { status: 500 }
    );
  }
}
