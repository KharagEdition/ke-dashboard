/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/send-update-notification/route.ts
import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";

interface UpdateNotificationRequest {
  title: string;
  body: string;
  data?: Record<string, string>;
  topic?: string;
  tokens?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const {
      title,
      body,
      data,
      topic = "all-users",
      tokens,
    }: UpdateNotificationRequest = await request.json();

    // Validate required fields
    if (!title || !body) {
      return NextResponse.json(
        { message: "Title and body are required" },
        { status: 400 }
      );
    }

    // Check if Firebase Admin is initialized
    if (admin.apps.length === 0) {
      return NextResponse.json(
        {
          message:
            "Firebase Admin not initialized. Please upload Firebase config first.",
        },
        { status: 500 }
      );
    }

    // Get the messaging instance
    const messaging = admin.messaging();

    // Prepare notification payload matching Android app expectations
    const message: admin.messaging.Message = {
      // NO notification payload - this ensures onMessageReceived is always called
      //   notification: {
      //     title: title,
      //     body: body,
      //   },
      data: {
        title: title,
        message: body, // Android expects 'message' not 'body'
        type: data?.type || "app_update",
        version: data?.version || "",
        url: data?.url || "",
        timestamp: new Date().toISOString(),
        // Include any additional data fields
        ...(data || {}),
      },
      // Set Android-specific options for better delivery
      android: {
        priority: "high",
        // This ensures the message wakes up the app
        data: {
          title: title,
          message: body,
          type: data?.type || "app_update",
          version: data?.version || "",
          url: data?.url || "",
          timestamp: new Date().toISOString(),
          ...(data || {}),
        },
      },
      // Add topic or tokens
      topic: topic,
    };

    console.log("Sending message:", JSON.stringify(message, null, 2));

    const response = await messaging.send(message);

    console.log(`Notification sent to topic "${topic}":`, response);

    return NextResponse.json({
      message: `Notification sent successfully to topic: ${topic}`,
      messageId: response,
      topic,
      dataPayload: message.data,
    });
  } catch (error: any) {
    console.error("Error sending notification:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });

    // Handle specific Firebase errors
    if (error.code === "messaging/invalid-argument") {
      return NextResponse.json(
        { message: "Invalid message format or topic name" },
        { status: 400 }
      );
    }

    if (error.code === "messaging/authentication-error") {
      return NextResponse.json(
        {
          message:
            "Firebase authentication failed. Check your service account configuration.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        message: "Failed to send notification",
        error: error.message || "Unknown error",
        code: error.code || "UNKNOWN",
      },
      { status: 500 }
    );
  }
}
