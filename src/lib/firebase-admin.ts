/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/firebase-admin.ts
import {
  initializeApp,
  getApps,
  cert,
  App,
  deleteApp,
} from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let adminApp: App | null = null;
let firestoreDb: Firestore | null = null;

// Function to initialize Firebase with uploaded config
export const initializeFirebaseWithConfig = (
  serviceAccount: any
): { app: App; db: Firestore } => {
  try {
    // Clear existing apps
    const existingApps = getApps();
    existingApps.forEach((app) => {
      try {
        deleteApp(app);
      } catch (error) {
        console.log("Error deleting existing app:", error);
      }
    });

    // Initialize new app with uploaded config
    adminApp = initializeApp(
      {
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      },
      `app-${Date.now()}`
    );

    firestoreDb = getFirestore(adminApp);

    console.log("Firebase initialized with uploaded config");
    return { app: adminApp, db: firestoreDb };
  } catch (error) {
    console.error("Error initializing Firebase with config:", error);
    throw error;
  }
};

// Default initialization (for fallback)
const getDefaultServiceAccount = () => {
  return {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
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
  if (!adminApp && process.env.FIREBASE_PROJECT_ID) {
    try {
      const defaultServiceAccount = getDefaultServiceAccount();
      adminApp = initializeApp({
        credential: cert(defaultServiceAccount as any),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
      firestoreDb = getFirestore(adminApp);
      console.log("Firebase initialized with environment variables");
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
  return adminApp !== null && firestoreDb !== null;
};

// Export function to get current app (for testing)
export const getCurrentApp = (): App | null => {
  return adminApp;
};
