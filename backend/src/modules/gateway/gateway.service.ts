import axios from "axios";
import { prisma } from "../../config/prisma";
import { AppError } from "../../common/middleware/errorHandler";
import { redisClient } from "../../config/redis";

const WINDOW_MS = 60_000;

export class GatewayService {
  async validateApiKey(key: string) {
    const apiKey = await prisma.apiKey.findUnique({
      where: { key },
      include: {
        subscription: {
          include: {
            apiPlan: {
              include: {
                api: true,
              },
            },
            user: true,
          },
        },
      },
    });
    if (!apiKey || !apiKey.isActive || apiKey.revokedAt) {
      throw new AppError("Invalid API key", 401);
    }
    if (!apiKey.subscription || apiKey.subscription.status !== "ACTIVE") {
      throw new AppError("Inactive subscription", 403);
    }
    if (apiKey.subscription.apiPlan.api.status !== "LIVE") {
      throw new AppError("API not live", 403);
    }
    return apiKey;
  }

  /**
   * Check if the subscription has exceeded its monthly quota (current calendar month).
   * Throws if quota is set and usage >= quota.
   */
  async checkMonthlyQuota(subscriptionId: string, monthlyQuota: number | null) {
    if (monthlyQuota == null) return;
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const count = await prisma.usageLog.count({
      where: {
        subscriptionId,
        timestamp: { gte: startOfMonth, lte: now },
      },
    });
    if (count >= monthlyQuota) {
      throw new AppError(
        `Monthly quota exceeded (${count}/${monthlyQuota} calls). Quota resets at the start of next month.`,
        429
      );
    }
  }

  async checkRateLimit(
    identifier: string, // Can be apiKeyId or IP address
    apiId: string,
    limitPerMinute: number | null
  ) {
    if (!limitPerMinute) return;
    const key = `rate:${identifier}:${apiId}`;
    const now = Date.now();
    const windowStart = now - WINDOW_MS;

    const tx = redisClient.multi();
    tx.zRemRangeByScore(key, 0, windowStart);
    tx.zAdd(key, { score: now, value: now.toString() });
    tx.zCard(key);
    tx.expire(key, Math.ceil(WINDOW_MS / 1000));
    const [, , count] = (await tx.exec()) as [unknown, unknown, number, unknown];

    if (count > limitPerMinute) {
      throw new AppError("Rate limit exceeded", 429);
    }
  }

  async getApiBySlug(apiSlug: string) {
    const api = await prisma.api.findUnique({
      where: { slug: apiSlug },
      include: {
        plans: {
          select: {
            id: true,
            name: true,
            description: true,
            billingType: true,
            priceMonthly: true,
            freeTier: true,
            monthlyQuota: true,
            createdAt: true,
            apiId: true,
          },
        },
      },
    });
    if (!api || api.status !== "LIVE") {
      throw new AppError("API not found", 404);
    }
    return api;
  }

  async forwardRequest(opts: {
    apiSlug: string;
    path: string;
    method: string;
    headers: Record<string, string | string[] | undefined>;
    body: unknown;
    apiKeyId?: string | null;
    userId?: string | null;
    subscriptionId?: string | null;
    rateLimitIdentifier?: string; // For IP-based rate limiting
    planLimitPerMinute?: number | null;
  }) {
    const api = await this.getApiBySlug(opts.apiSlug);

    // Get plan details if we have a subscription
    let plan = null;
    if (opts.apiKeyId) {
      const apiKey = await prisma.apiKey.findUnique({
        where: { id: opts.apiKeyId },
        include: {
          subscription: {
            include: {
              apiPlan: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  billingType: true,
                  priceMonthly: true,
                  freeTier: true,
                  monthlyQuota: true,
                  createdAt: true,
                  apiId: true,
                },
              },
              user: true,
            },
          },
        },
      });

      if (!apiKey || !apiKey.subscription) {
        throw new AppError("Invalid API key", 401);
      }

      if (apiKey.subscription.apiPlan.apiId !== api.id) {
        throw new AppError("Invalid API key for this API", 403);
      }

      plan = apiKey.subscription.apiPlan;
    }

    // Enforce monthly quota before forwarding (so over-quota requests are rejected and not logged)
    if (opts.subscriptionId && plan?.monthlyQuota != null) {
      await this.checkMonthlyQuota(opts.subscriptionId, plan.monthlyQuota);
    }

    // Use provided rate limit; do not use monthlyQuota as per-minute limit (it's per month)
    const planLimitPerMinute = opts.planLimitPerMinute ?? null;
    const rateLimitId = opts.rateLimitIdentifier || opts.apiKeyId || "anonymous";

    // Check rate limit (per-minute, separate from monthly quota)
    await this.checkRateLimit(rateLimitId, api.id, planLimitPerMinute);

    const url = `${api.baseUrl}/${opts.path}`;
    const start = Date.now();

    // Filter out headers that shouldn't be forwarded to the target API
    // These are "hop-by-hop" headers or headers that can cause SSL/routing issues
    const forwardHeaders: Record<string, string | string[] | undefined> = {};
    const headersToRemove = [
      'host',
      'connection',
      'keep-alive',
      'proxy-authenticate',
      'proxy-authorization',
      'te',
      'trailers',
      'transfer-encoding',
      'upgrade',
      'x-api-key', // Don't forward our internal API key to the target
    ];

    for (const [key, value] of Object.entries(opts.headers)) {
      if (!headersToRemove.includes(key.toLowerCase())) {
        forwardHeaders[key] = value;
      }
    }

    let response;
    try {
      response = await axios.request({
        url,
        method: opts.method as any,
        headers: forwardHeaders,
        data: opts.body,
        validateStatus: () => true,
      });
    } catch (error: any) {
      throw new AppError(`Gateway forwarding failed: ${error.message}`, 502);
    }

    const latencyMs = Date.now() - start;

    const requestBody =
      opts.body && typeof opts.body === "string"
        ? opts.body
        : opts.body
          ? JSON.stringify(opts.body)
          : "";
    const bytesIn = Buffer.byteLength(requestBody);

    const responseBodyString =
      typeof response.data === "string" ? response.data : JSON.stringify(response.data ?? "");
    const bytesOut = Buffer.byteLength(responseBodyString);

    // Log usage (works with or without API key)
    await prisma.usageLog.create({
      data: {
        apiId: api.id,
        apiKeyId: opts.apiKeyId ?? null,
        subscriptionId: opts.subscriptionId ?? null,
        userId: opts.userId ?? null,
        path: `/${opts.path}`,
        method: opts.method.toUpperCase(),
        statusCode: response.status,
        latencyMs,
        bytesIn,
        bytesOut,
      },
    });

    return response;
  }
}

