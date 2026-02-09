import dotenv from "dotenv";

dotenv.config();

export interface AppConfig {
  port: number;
  corsOrigin: string;
  databaseUrl: string;
  redisUrl: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  razorpayKeyId: string;
  razorpayKeySecret: string;
  razorpayTestMode: boolean;
  emailEnabled: boolean;
  emailHost: string;
  emailPort: number;
  emailSecure: boolean;
  emailUser: string;
  emailPassword: string;
  emailFrom: string;
  emailFromName: string;
  firebaseProjectId: string;
  firebaseClientEmail: string;
  firebasePrivateKey: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getEnvOrEmpty(name: string): string {
  return process.env[name] || "";
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export const config: AppConfig = {
  port: Number(process.env.PORT) || 4000,
  corsOrigin: process.env.CORS_ORIGIN || "*",
  databaseUrl: requireEnv("DATABASE_URL"),
  redisUrl: requireEnv("REDIS_URL"),
  jwtAccessSecret: requireEnv("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: requireEnv("JWT_REFRESH_SECRET"),
  // Use test keys if RAZORPAY_TEST_MODE is true, otherwise use production keys
  razorpayKeyId: process.env.RAZORPAY_TEST_MODE === "true"
    ? requireEnv("RAZORPAY_TEST_KEY_ID")
    : (getEnvOrEmpty("RAZORPAY_KEY_ID") || requireEnv("RAZORPAY_TEST_KEY_ID")),
  razorpayKeySecret: process.env.RAZORPAY_TEST_MODE === "true"
    ? requireEnv("RAZORPAY_TEST_KEY_SECRET")
    : (getEnvOrEmpty("RAZORPAY_KEY_SECRET") || requireEnv("RAZORPAY_TEST_KEY_SECRET")),
  razorpayTestMode: process.env.RAZORPAY_TEST_MODE === "true",
  emailEnabled: process.env.EMAIL_ENABLED !== "false",
  emailHost: process.env.EMAIL_HOST || "smtp.gmail.com",
  emailPort: Number(process.env.EMAIL_PORT) || 587,
  emailSecure: process.env.EMAIL_SECURE === "true",
  emailUser: process.env.EMAIL_USER || "",
  emailPassword: process.env.EMAIL_PASSWORD || "",
  emailFrom: process.env.EMAIL_FROM || process.env.EMAIL_USER || "noreply@apimarketplace.com",
  emailFromName: process.env.EMAIL_FROM_NAME || "API Marketplace",
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || "",
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL || "",
  firebasePrivateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
};

