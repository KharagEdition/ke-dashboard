import { initializeFirebaseWithConfig } from "@/lib/firebase-admin";
import { NextApiResponse } from "next";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest, res: NextApiResponse) {
  try {
    const body = await request.json();
    const { firebaseConfig } = body;
    if (!firebaseConfig) {
      return res.status(400).json({ error: "Missing config" });
    }
    const decoded = Buffer.from(firebaseConfig, "base64").toString("utf8");

    const serviceAccount = JSON.parse(decoded);

    initializeFirebaseWithConfig(serviceAccount);

    console.log("Firebase config initialized successfully");

    return new Response(
      JSON.stringify({ message: "Firebase config uploaded successfully" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
    });
  }
}
