import crypto from "crypto";
import { prisma } from "../../config/prisma";
import { AppError } from "../../common/middleware/errorHandler";
import { NotificationService } from "../notifications/notification.service";
import { auditLog } from "../audit/audit.service";

const notificationService = new NotificationService();

export class SubscriptionsService {
  async subscribe(userId: string, apiPlanId: string) {
    const plan = await prisma.apiPlan.findUnique({ where: { id: apiPlanId } });
    if (!plan) throw new AppError("Plan not found", 404);
    const status = (plan.freeTier || !plan.priceMonthly) ? "ACTIVE" : "PENDING";
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        apiPlanId,
        status,
      },
      include: {
        apiPlan: {
          include: {
            api: true
          }
        }
      }
    });

    auditLog.log({
      userId,
      action: "SUBSCRIPTION_CREATED",
      entity: "Subscription",
      entityId: subscription.id,
      metadata: { apiPlanId, apiName: subscription.apiPlan?.api?.name },
    });

    return { subscription, mandateRequired: false };
  }

  async listUserSubscriptions(userId: string) {
    return prisma.subscription.findMany({
      where: { userId },
      include: {
        apiPlan: {
          include: {
            api: true,
          },
        },
        apiKeys: true,
      },
      orderBy: { startedAt: "desc" },
    });
  }

  async listKeys(subscriptionId: string) {
    return prisma.apiKey.findMany({
      where: { subscriptionId },
      orderBy: { createdAt: "desc" },
    });
  }

  async createApiKey(subscriptionId: string, label?: string) {
    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        apiPlan: {
          include: {
            api: true,
          },
        },
      },
    });
    if (!sub || sub.status !== "ACTIVE") {
      throw new AppError("Subscription not active", 400);
    }

    // API authentication method: API Key only
    const rawKey = `key_${crypto.randomUUID()}`;

    const key = await prisma.apiKey.create({
      data: {
        key: rawKey,
        label,
        subscription: {
          connect: { id: subscriptionId },
        },
        user: {
          connect: { id: sub.userId },
        },
      },
    });

    auditLog.log({
      userId: sub.userId,
      action: "API_KEY_CREATED",
      entity: "ApiKey",
      entityId: key.id,
      metadata: { subscriptionId, apiName: sub.apiPlan?.api?.name },
    });

    return key;
  }

  async regenerateKey(subscriptionId: string, keyId: string) {
    const key = await prisma.apiKey.findFirst({
      where: { id: keyId, subscriptionId },
      include: { user: true },
    });
    if (!key) throw new AppError("Key not found", 404);
    const newKey = `key_${crypto.randomUUID()}`;
    const updated = await prisma.apiKey.update({
      where: { id: key.id },
      data: {
        key: newKey,
        revokedAt: null,
        isActive: true,
      },
    });
    auditLog.log({
      userId: key.userId,
      action: "API_KEY_REGENERATED",
      entity: "ApiKey",
      entityId: key.id,
      metadata: { subscriptionId },
    });
    return updated;
  }

  async revokeKey(subscriptionId: string, keyId: string) {
    const key = await prisma.apiKey.findFirst({
      where: { id: keyId, subscriptionId },
    });
    if (!key) throw new AppError("Key not found", 404);
    const updated = await prisma.apiKey.update({
      where: { id: key.id },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });
    auditLog.log({
      userId: key.userId,
      action: "API_KEY_REVOKED",
      entity: "ApiKey",
      entityId: key.id,
      metadata: { subscriptionId },
    });
    return updated;
  }

  async deleteKey(subscriptionId: string, keyId: string) {
    const key = await prisma.apiKey.findFirst({
      where: { id: keyId, subscriptionId },
    });
    if (!key) throw new AppError("Key not found", 404);

    await prisma.apiKey.delete({
      where: { id: key.id },
    });

    auditLog.log({
      userId: key.userId,
      action: "API_KEY_DELETED",
      entity: "ApiKey",
      entityId: key.id,
      metadata: { subscriptionId },
    });

    return { deleted: true, keyId };
  }

  /**
   * Delete a subscription permanently.
   * Any subscription (ACTIVE, CANCELLED, PENDING) can be deleted; API keys are removed.
   */
  async deleteSubscription(subscriptionId: string, userId: string) {
    const subscription = await prisma.subscription.findFirst({
      where: { id: subscriptionId, userId },
    });

    if (!subscription) {
      throw new AppError("Subscription not found", 404);
    }

    // Delete all API keys associated with this subscription
    await prisma.apiKey.deleteMany({
      where: { subscriptionId },
    });

    // Delete the subscription
    await prisma.subscription.delete({
      where: { id: subscriptionId },
    });

    auditLog.log({
      userId,
      action: "SUBSCRIPTION_CANCELLED",
      entity: "Subscription",
      entityId: subscriptionId,
    });

    return { deleted: true, subscriptionId };
  }

  /**
   * Delete multiple subscriptions at once (any status).
   */
  async deleteMultipleSubscriptions(subscriptionIds: string[], userId: string) {
    // Verify all subscriptions exist and belong to user
    const subscriptions = await prisma.subscription.findMany({
      where: {
        id: { in: subscriptionIds },
        userId,
      },
    });

    if (subscriptions.length !== subscriptionIds.length) {
      throw new AppError("Some subscriptions were not found", 404);
    }

    // Delete all API keys for these subscriptions
    await prisma.apiKey.deleteMany({
      where: { subscriptionId: { in: subscriptionIds } },
    });

    // Delete all subscriptions
    const result = await prisma.subscription.deleteMany({
      where: { id: { in: subscriptionIds } },
    });

    return { deleted: true, count: result.count };
  }

  async getUsageForUser(userId: string) {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const logs = await prisma.usageLog.groupBy({
      by: ["apiId"],
      where: { userId, timestamp: { gte: since } },
      _count: { _all: true },
    });
    return logs;
  }

  /**
   * Get detailed usage statistics per subscription for the user
   * Includes request count, charges (paid/unpaid), and billing details
   */
  async getDetailedUsageStats(userId: string) {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    // Get all active subscriptions with their plans
    const subscriptions = await prisma.subscription.findMany({
      where: { userId, status: "ACTIVE" },
      include: {
        apiPlan: {
          include: {
            api: true,
          },
        },
      },
    });

    const stats = [];

    for (const sub of subscriptions) {
      // Get usage logs for this subscription
      const usageLogs = await prisma.usageLog.findMany({
        where: {
          subscriptionId: sub.id,
          timestamp: { gte: since },
        },
        orderBy: { timestamp: "desc" },
      });

      // Calculate totals
      const totalRequests = usageLogs.length;
      const successfulRequests = usageLogs.filter(l => l.statusCode >= 200 && l.statusCode < 300).length;
      const failedRequests = usageLogs.filter(l => l.statusCode >= 400).length;

      // Get quota info
      const plan = sub.apiPlan;
      const hasQuota = plan.monthlyQuota !== null;
      const quotaUsedPercent = hasQuota && plan.monthlyQuota
        ? Math.round((totalRequests / plan.monthlyQuota) * 100)
        : null;

      stats.push({
        subscriptionId: sub.id,
        api: {
          id: plan.api.id,
          name: plan.api.name,
          slug: plan.api.slug,
        },
        plan: {
          id: plan.id,
          name: plan.name,
          billingType: plan.billingType,
          priceMonthly: plan.priceMonthly,
          monthlyQuota: plan.monthlyQuota,
          freeTier: plan.freeTier,
        },
        usage: {
          totalRequests,
          successfulRequests,
          failedRequests,
          periodStart: since,
          periodEnd: new Date(),
        },
        billing: {
          chargedAmount: 0,
          unchargedAmount: 0,
          unchargedRequests: 0,
          totalCharges: 0,
        },
        quota: hasQuota ? {
          limit: plan.monthlyQuota,
          used: totalRequests,
          remaining: Math.max(0, (plan.monthlyQuota || 0) - totalRequests),
          usedPercent: quotaUsedPercent,
        } : null,
      });
    }

    return stats;
  }

  /**
   * Get user's purchase/subscription history with payment details
   */
  async getPurchaseHistory(userId: string) {
    // Get all subscriptions for this user
    const subscriptions = await prisma.subscription.findMany({
      where: { userId },
      include: {
        apiPlan: {
          include: {
            api: {
              include: {
                provider: {
                  select: {
                    displayName: true,
                  },
                },
              },
            },
          },
        },
        apiKeys: {
          select: {
            id: true,
            isActive: true,
          },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    // Get all payments for this user
    const payments = await prisma.payment.findMany({
      where: {
        userId,
      },
      include: {
        invoice: {
          select: {
            id: true,
            periodStart: true,
            periodEnd: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Create a map of subscriptionId -> payments
    const paymentsBySubscription: Map<string, any[]> = new Map();
    for (const payment of payments) {
      const payload = payment.payload as any;
      const notes = payload?.notes || payload;
      const subscriptionId = notes?.subscriptionId;
      if (subscriptionId) {
        const existing = paymentsBySubscription.get(subscriptionId) || [];
        existing.push({
          id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          createdAt: payment.createdAt,
          invoice: payment.invoice,
        });
        paymentsBySubscription.set(subscriptionId, existing);
      }
    }

    // Build the purchase history
    return subscriptions.map((sub) => {
      const subPayments = paymentsBySubscription.get(sub.id) || [];
      const totalPaid = subPayments
        .filter((p) => p.status === "SUCCEEDED")
        .reduce((sum, p) => sum + p.amount, 0);

      return {
        subscriptionId: sub.id,
        subscribedAt: sub.startedAt,
        status: sub.status,
        endsAt: sub.endsAt,
        cancelledAt: sub.cancelledAt,
        api: {
          id: sub.apiPlan.api.id,
          name: sub.apiPlan.api.name,
          slug: sub.apiPlan.api.slug,
          providerName: sub.apiPlan.api.provider?.displayName || "Unknown",
        },
        plan: {
          id: sub.apiPlan.id,
          name: sub.apiPlan.name,
          description: sub.apiPlan.description,
          billingType: sub.apiPlan.billingType,
          priceMonthly: sub.apiPlan.priceMonthly,
          freeTier: sub.apiPlan.freeTier,
          monthlyQuota: sub.apiPlan.monthlyQuota,
        },
        apiKeysCount: sub.apiKeys.length,
        activeApiKeys: sub.apiKeys.filter((k) => k.isActive).length,
        payments: subPayments,
        totalPaid,
      };
    });
  }
}

