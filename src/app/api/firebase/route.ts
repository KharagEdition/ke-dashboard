import { initializeFirebaseWithConfig } from "@/lib/firebase-admin";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firebaseConfig } = body;
    if (!firebaseConfig) {
      return new Response(
        JSON.stringify({ message: "Missing firebaseConfig in request body" }),
        { status: 400 }
      );
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
