import { createServer } from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { json } from "express";
import { errorHandler } from "./common/middleware/errorHandler";
import { requestLogger } from "./common/middleware/requestLogger";
import { registerRoutes } from "./routes";
import { config } from "./config/env";
import { verifyDbConnection } from "./config/db";
import { connectRedis } from "./config/redis";
import { logger } from "./common/logger";
import { schedulePaymentRetries } from "./jobs/usageAggregation.worker";
import { scheduleSubscriptionExpiryChecks } from "./jobs/subscriptionExpiry.worker";
import { initSocketIO } from "./socket";

async function bootstrap() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigin,
    })
  );
  app.use(json());
  app.use(requestLogger);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  registerRoutes(app);

  app.use(errorHandler);

  await verifyDbConnection();
  await connectRedis();

  // Start BullMQ workers (import triggers Worker instantiation → attaches to Redis and processes jobs)
  await import("./jobs/email.worker");
  await import("./jobs/subscriptionExpiry.worker");
  await import("./jobs/usageAggregation.worker");

  if (process.env.SCHEDULE_PAYMENT_RETRIES !== "false") {
    setTimeout(async () => {
      try {
        await schedulePaymentRetries();
      } catch (error) {
        logger.error("Failed to schedule payment retries", error);
      }
    }, 120000);

    setInterval(async () => {
      try {
        await schedulePaymentRetries();
      } catch (error) {
        logger.error("Failed to schedule payment retries", error);
      }
    }, 24 * 60 * 60 * 1000);
  }

  if (process.env.SCHEDULE_SUBSCRIPTION_EXPIRY !== "false") {
    setTimeout(async () => {
      try {
        await scheduleSubscriptionExpiryChecks();
      } catch (error) {
        logger.error("Failed to schedule subscription expiry checks", error);
      }
    }, 180000);

    setInterval(async () => {
      try {
        await scheduleSubscriptionExpiryChecks();
      } catch (error) {
        logger.error("Failed to schedule subscription expiry checks", error);
      }
    }, 24 * 60 * 60 * 1000);
  }

  const httpServer = createServer(app);
  initSocketIO(httpServer);

  httpServer.listen(config.port, () => {
    logger.info(`API Marketplace backend listening on port ${config.port}`);
  });
}

bootstrap().catch((err) => {
  logger.error("Failed to bootstrap application", err);
  process.exit(1);
});
