import type { Express } from "express";
import { authRouter } from "./modules/auth/auth.routes";
import { apisRouter } from "./modules/apis/apis.routes";
import { subscriptionsRouter } from "./modules/subscriptions/subscriptions.routes";
import { billingRouter } from "./modules/billing/billing.routes";
import { gatewayRouter } from "./modules/gateway/gateway.routes";
import { analyticsRouter } from "./modules/analytics/analytics.routes";
import { notificationsRouter } from "./modules/notifications/notifications.routes";
import { auditRouter } from "./modules/audit/audit.routes";

export function registerRoutes(app: Express) {
  app.get("/", (_req, res) => {
    res.json({ message: "API Marketplace backend" });
  });

  app.use("/auth", authRouter);
  app.use("/", apisRouter);
  app.use("/subscriptions", subscriptionsRouter);
  app.use("/billing", billingRouter);
  app.use("/audit-logs", auditRouter);
  app.use("/", analyticsRouter);
  app.use("/", gatewayRouter);
  app.use("/", notificationsRouter);
}

