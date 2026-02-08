import { Router } from "express";
import { authenticateJWT } from "../auth/middleware/authenticate";
import { requireRole } from "../rbac/middleware/rbac";
import { prisma } from "../../config/prisma";
import { AnalyticsService } from "./analytics.service";
import { AppError } from "../../common/middleware/errorHandler";

const router = Router();
const analyticsService = new AnalyticsService();

router.get(
  "/analytics/provider/usage",
  authenticateJWT,
  requireRole("User"),
  async (req, res, next) => {
    try {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const data = await prisma.usageLog.groupBy({
        by: ["apiId"],
        where: { timestamp: { gte: since } },
        _count: { _all: true },
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/analytics/consumer/usage",
  authenticateJWT,
  requireRole("User"),
  async (req, res, next) => {
    try {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const data = await prisma.usageLog.groupBy({
        by: ["apiId"],
        where: { userId: req.user!.sub, timestamp: { gte: since } },
        _count: { _all: true },
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/analytics/admin/overview",
  authenticateJWT,
  requireRole("SuperAdmin"),
  async (_req, res, next) => {
    try {
      const [apiCount, userCount, invoiceStats] = await Promise.all([
        prisma.api.count(),
        prisma.user.count(),
        prisma.invoice.groupBy({
          by: ["status"],
          _sum: { amount: true },
        }),
      ]);
      res.json({ success: true, apiCount, userCount, invoiceStats, dailyUsage: [] });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/analytics/provider/revenue",
  authenticateJWT,
  requireRole("User"),
  async (req, res, next) => {
    try {
      const userId = req.user!.sub;
      const { providerId, startDate, endDate, groupBy } = req.query;

      // Determine which provider to query
      let targetProviderId: string;

      if (providerId) {
        // Admin can query any provider
        if (req.user!.roles.includes("SuperAdmin")) {
          targetProviderId = providerId as string;
        } else {
          // Provider can only query their own
          const userProviderId = await analyticsService.getProviderIdForUser(userId);
          if (userProviderId !== providerId) {
            throw new AppError("Unauthorized: Can only view your own revenue", 403);
          }
          targetProviderId = userProviderId!;
        }
      } else {
        // No providerId specified - use current user's provider
        const userProviderId = await analyticsService.getProviderIdForUser(userId);
        if (!userProviderId) {
          throw new AppError("User is not a provider", 403);
        }
        targetProviderId = userProviderId;
      }

      // Parse dates
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      const group = (groupBy === "month" ? "month" : "day") as "day" | "month";

      // Validate dates
      if (start && isNaN(start.getTime())) {
        throw new AppError("Invalid startDate format", 400);
      }
      if (end && isNaN(end.getTime())) {
        throw new AppError("Invalid endDate format", 400);
      }
      if (start && end && start > end) {
        throw new AppError("startDate must be before endDate", 400);
      }

      const revenue = await analyticsService.getProviderRevenue(
        targetProviderId,
        start,
        end,
        group
      );

      res.json({ success: true, data: revenue });
    } catch (err) {
      next(err);
    }
  }
);

// Get provider's sales history (who bought their APIs)
router.get(
  "/analytics/provider/sales",
  authenticateJWT,
  requireRole("User"),
  async (req, res, next) => {
    try {
      const userId = req.user!.sub;
      const { providerId, startDate, endDate } = req.query;

      // Determine which provider to query
      let targetProviderId: string;

      if (providerId) {
        // Admin can query any provider
        if (req.user!.roles.includes("SuperAdmin")) {
          targetProviderId = providerId as string;
        } else {
          // Provider can only query their own
          const userProviderId = await analyticsService.getProviderIdForUser(userId);
          if (userProviderId !== providerId) {
            throw new AppError("Unauthorized: Can only view your own sales", 403);
          }
          targetProviderId = userProviderId!;
        }
      } else {
        // No providerId specified - use current user's provider
        const userProviderId = await analyticsService.getProviderIdForUser(userId);
        if (!userProviderId) {
          throw new AppError("User is not a provider", 403);
        }
        targetProviderId = userProviderId;
      }

      // Parse dates
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      // Validate dates
      if (start && isNaN(start.getTime())) {
        throw new AppError("Invalid startDate format", 400);
      }
      if (end && isNaN(end.getTime())) {
        throw new AppError("Invalid endDate format", 400);
      }

      const sales = await analyticsService.getProviderSales(
        targetProviderId,
        start,
        end
      );

      res.json({ success: true, data: sales });
    } catch (err) {
      next(err);
    }
  }
);

// Get global finance details for admin
router.get(
  "/analytics/admin/finance",
  authenticateJWT,
  requireRole("SuperAdmin"),
  async (_req, res, next) => {
    try {
      const finance = await analyticsService.getAdminFinanceDetails();
      res.json({ success: true, data: finance });
    } catch (err) {
      next(err);
    }
  }
);

export const analyticsRouter = router;

