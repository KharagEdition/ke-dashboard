/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/firebase-admin.ts
import admin from "firebase-admin";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let firestoreDb: Firestore | null = null;

// Function to initialize Firebase with uploaded config
export const initializeFirebaseWithConfig = (
  serviceAccount: any
): { app: admin.app.App; db: Firestore } => {
  try {
    // Clear existing apps
    if (admin.apps.length > 0) {
      admin.apps.forEach((app) => {
        if (app) {
          try {
            app.delete();
          } catch (error) {
            console.log("Error deleting existing app:", error);
          }
        }
      });
    }

    // Initialize new app with uploaded config
    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key,
      }),
      projectId: serviceAccount.project_id,
    });

    firestoreDb = getFirestore(app);

    console.log("Firebase initialized with uploaded config");
    console.log("Project ID:", serviceAccount.project_id);

    return { app, db: firestoreDb };
  } catch (error) {
    console.error("Error initializing Firebase with config:", error);
    throw error;
  }
};

// Default initialization (for fallback)
const getDefaultServiceAccount = () => {
  if (
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_PRIVATE_KEY ||
    !process.env.FIREBASE_CLIENT_EMAIL
  ) {
    return null;
  }

  return {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
    universe_domain: "googleapis.com",
  };
};

// Initialize with environment variables if available
const initializeDefault = () => {
  if (admin.apps.length === 0) {
    try {
      const defaultServiceAccount = getDefaultServiceAccount();
      if (defaultServiceAccount) {
        admin.initializeApp({
          credential: admin.credential.cert(defaultServiceAccount as any),
          projectId: defaultServiceAccount.project_id,
        });
        firestoreDb = getFirestore();
        console.log("Firebase initialized with environment variables");
      }
    } catch (error) {
      console.log(
        "Could not initialize Firebase with environment variables:",
        error
      );
    }
  }
};

// Try to initialize on import
initializeDefault();

// Export db getter that handles both cases
export const db = new Proxy({} as Firestore, {
  get: function (target, prop) {
    if (!firestoreDb) {
      // Try to initialize default if not already done
      initializeDefault();
    }

    if (!firestoreDb) {
      throw new Error(
        "Firestore not initialized. Please upload Firebase config or set environment variables."
      );
    }

    return (firestoreDb as any)[prop];
  },
});

// Export function to check if Firebase is initialized
export const isFirebaseInitialized = (): boolean => {
  return admin.apps.length > 0 && firestoreDb !== null;
};

// Export function to get current app (for testing)
export const getCurrentApp = (): admin.app.App | null => {
  return admin.apps.length > 0 ? admin.apps[0]! : null;
};
