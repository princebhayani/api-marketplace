import admin from "firebase-admin";
import { config } from "./env";
import { logger } from "../common/logger";
import path from "path";

if (config.firebaseServiceAccountKey) {
  let serviceAccount;
  try {
    // Try to require it if it's a path or JSON object
    if (config.firebaseServiceAccountKey.startsWith("{")) {
      serviceAccount = JSON.parse(config.firebaseServiceAccountKey);
    } else {
      serviceAccount = require(path.resolve(config.firebaseServiceAccountKey));
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    logger.info("Firebase Admin initialized");
  } catch (error) {
    logger.error("Failed to initialize Firebase Admin:", error);
  }
} else {
  logger.warn("FIREBASE_SERVICE_ACCOUNT_KEY not provided. OAuth login will fail.");
}

// Export auth only if app is initialized, otherwise export a dummy object
export const firebaseAuth = admin.apps.length > 0 ? admin.auth() : {
  verifyIdToken: async () => { throw new Error("Firebase Admin not initialized correctly. Check logs for details."); },
  getUser: async () => { throw new Error("Firebase Admin not initialized correctly. Check logs for details."); },
  createUser: async () => { throw new Error("Firebase Admin not initialized correctly. Check logs for details."); },
  updateUser: async () => { throw new Error("Firebase Admin not initialized correctly. Check logs for details."); },
  deleteUser: async () => { throw new Error("Firebase Admin not initialized correctly. Check logs for details."); },
} as any;
