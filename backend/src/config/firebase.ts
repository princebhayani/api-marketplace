import admin from "firebase-admin";
import { config } from "./env";
import { logger } from "../common/logger";

if (config.firebaseProjectId && config.firebaseClientEmail && config.firebasePrivateKey) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebaseProjectId,
        clientEmail: config.firebaseClientEmail,
        privateKey: config.firebasePrivateKey,
      }),
    });
    logger.info("Firebase Admin initialized");
  } catch (error) {
    logger.error("Failed to initialize Firebase Admin:", error);
  }
} else {
  logger.warn("Firebase env vars (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) not provided. OAuth login will fail.");
}

// Export auth only if app is initialized, otherwise export a dummy object
export const firebaseAuth = admin.apps.length > 0 ? admin.auth() : {
  verifyIdToken: async () => { throw new Error("Firebase Admin not initialized correctly. Check logs for details."); },
  getUser: async () => { throw new Error("Firebase Admin not initialized correctly. Check logs for details."); },
  createUser: async () => { throw new Error("Firebase Admin not initialized correctly. Check logs for details."); },
  updateUser: async () => { throw new Error("Firebase Admin not initialized correctly. Check logs for details."); },
  deleteUser: async () => { throw new Error("Firebase Admin not initialized correctly. Check logs for details."); },
} as any;
