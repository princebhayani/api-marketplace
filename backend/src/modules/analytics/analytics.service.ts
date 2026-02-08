import { prisma } from "../../config/prisma";
import { AppError } from "../../common/middleware/errorHandler";
import { logger } from "../../common/logger";
import { RazorpayPayload, PaymentNotes, MS } from "../../common/types";

export interface ProviderRevenueStats {
  providerId: string;
  providerName: string;
  totalRevenue: number;
  subscriptionRevenue: number;
  commissionRate: number;
  commissionAmount: number;
  netRevenue: number;
  currency: string;
  timeSeries: {
    date: string;
    revenue: number;
    subscriptionRevenue: number;
    commissionAmount: number;
    netRevenue: number;
  }[];
  byApi: {
    apiId: string;
    apiName: string;
    revenue: number;
    subscriptionRevenue: number;
  }[];
}

export class AnalyticsService {
  /**
   * Default commission rate (10% - configurable via env)
   */
  private getCommissionRate(): number {
    const rate = parseFloat(process.env.PROVIDER_COMMISSION_RATE || "0.1");
    return Math.max(0, Math.min(1, rate)); // Clamp between 0 and 1
  }

  /**
   * Calculate provider revenue statistics
   */
  async getProviderRevenue(
    providerId: string,
    startDate?: Date,
    endDate?: Date,
    groupBy: "day" | "month" = "day"
  ): Promise<ProviderRevenueStats> {
    const provider = await prisma.apiProvider.findUnique({
      where: { id: providerId },
      include: {
        user: true,
        apis: {
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
        },
      },
    });

    if (!provider) {
      throw new AppError("Provider not found", 404);
    }

    const now = new Date();
    const start = startDate || new Date(now.getTime() - MS.MONTH_30); // Default: last 30 days
    const end = endDate || now;

    // Get all APIs for this provider
    const apiIds = provider.apis.map((api) => api.id);

    // Calculate subscription revenue from paid invoices
    const subscriptionRevenue = await this.calculateSubscriptionRevenue(
      apiIds,
      start,
      end
    );
    const totalRevenue = subscriptionRevenue.total;
    const commissionRate = this.getCommissionRate();
    const commissionAmount = Math.round(totalRevenue * commissionRate);
    const netRevenue = totalRevenue - commissionAmount;

    // Get time-series data
    const timeSeries = await this.getTimeSeriesRevenue(
      apiIds,
      start,
      end,
      groupBy,
      commissionRate
    );

    // Get revenue breakdown by API
    const byApi = await this.getRevenueByApi(apiIds, start, end);

    return {
      providerId: provider.id,
      providerName: provider.displayName,
      totalRevenue,
      subscriptionRevenue: subscriptionRevenue.total,
      commissionRate,
      commissionAmount,
      netRevenue,
      currency: "INR",
      timeSeries,
      byApi,
    };
  }

  /**
   * Calculate subscription revenue from paid invoices
   */
  private async calculateSubscriptionRevenue(
    apiIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<{ total: number; count: number }> {
    // Handle empty apiIds case
    if (apiIds.length === 0) {
      logger.info("calculateSubscriptionRevenue: No APIs found for provider");
      return { total: 0, count: 0 };
    }

    logger.info(`calculateSubscriptionRevenue: Looking for payments for ${apiIds.length} APIs`);

    // Also get current subscription IDs for backward compatibility (payments without apiId in notes)
    const subscriptions = await prisma.subscription.findMany({
      where: {
        apiPlan: {
          apiId: { in: apiIds },
        },
      },
      select: { id: true },
    });
    const subscriptionIds = new Set(subscriptions.map((s) => s.id));

    // Find all successful payments within the date range
    const paidPayments = await prisma.payment.findMany({
      where: {
        status: "SUCCEEDED",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        invoice: {
          status: "PAID",
        },
      },
      include: {
        invoice: true,
      },
    });

    logger.info(`calculateSubscriptionRevenue: Found ${paidPayments.length} successful payments in date range`);

    // Attribute by apiId in notes (survives subscription delete), invoice.apiId if present, or subscriptionId in current subs
    let total = 0;
    let count = 0;

    for (const payment of paidPayments) {
      const payload = payment.payload as RazorpayPayload | null;
      const notes: PaymentNotes = payload?.notes || (payload as unknown as PaymentNotes) || {};
      const apiIdFromNotes = notes?.apiId;
      const apiIdFromInvoice = (payment.invoice as { apiId?: string } | null)?.apiId ?? null;
      const subscriptionId = notes?.subscriptionId;

      const apiId = apiIdFromNotes || apiIdFromInvoice;
      const belongsToProvider =
        (apiId && apiIds.includes(apiId)) ||
        (subscriptionId && subscriptionIds.has(subscriptionId));

      if (belongsToProvider) {
        total += payment.amount;
        count++;
        logger.info(`calculateSubscriptionRevenue: Matched payment ${payment.id} (apiId: ${apiId ?? "n/a"}, subId: ${subscriptionId ?? "n/a"}) amount ${payment.amount}`);
      }
    }

    logger.info(`calculateSubscriptionRevenue: Total revenue ${total} from ${count} payments`);
    return { total, count };
  }

  /**
   * Get time-series revenue data
   */
  private async getTimeSeriesRevenue(
    apiIds: string[],
    startDate: Date,
    endDate: Date,
    groupBy: "day" | "month",
    commissionRate: number
  ): Promise<
    {
      date: string;
      revenue: number;
      subscriptionRevenue: number;
      commissionAmount: number;
      netRevenue: number;
    }[]
  > {
    const timeSeries: Map<string, { sub: number }> = new Map();

    // Handle empty apiIds case
    if (apiIds.length === 0) {
      return [];
    }

    // Get current subscription IDs for backward compatibility
    const subscriptions = await prisma.subscription.findMany({
      where: {
        apiPlan: {
          apiId: { in: apiIds },
        },
      },
      select: { id: true },
    });
    const subscriptionIds = new Set(subscriptions.map((s) => s.id));

    const paidPayments = await prisma.payment.findMany({
      where: {
        status: "SUCCEEDED",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        invoice: {
          status: "PAID",
        },
      },
      include: {
        invoice: true,
      },
    });

    for (const payment of paidPayments) {
      const payload = payment.payload as RazorpayPayload | null;
      const notes: PaymentNotes = payload?.notes || (payload as unknown as PaymentNotes) || {};
      const apiIdFromNotes = notes?.apiId;
      const apiIdFromInvoice = (payment.invoice as { apiId?: string } | null)?.apiId ?? null;
      const subscriptionId = notes?.subscriptionId;

      const apiId = apiIdFromNotes || apiIdFromInvoice;
      const belongsToProvider =
        (apiId && apiIds.includes(apiId)) ||
        (subscriptionId && subscriptionIds.has(subscriptionId));

      if (belongsToProvider) {
        const dateKey = this.formatDate(payment.createdAt, groupBy);
        const current = timeSeries.get(dateKey) || { sub: 0 };
        current.sub += payment.amount;
        timeSeries.set(dateKey, current);
      }
    }

    // Convert to array and calculate totals
    return Array.from(timeSeries.entries())
      .map(([date, revenues]) => {
        const revenue = revenues.sub;
        const commissionAmount = Math.round(revenue * commissionRate);
        return {
          date,
          revenue,
          subscriptionRevenue: revenues.sub,
          commissionAmount,
          netRevenue: revenue - commissionAmount,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get revenue breakdown by API
   */
  private async getRevenueByApi(
    apiIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<
    {
      apiId: string;
      apiName: string;
      revenue: number;
      subscriptionRevenue: number;
    }[]
  > {
    // Handle empty apiIds case
    if (apiIds.length === 0) {
      return [];
    }

    const apis = await prisma.api.findMany({
      where: { id: { in: apiIds } },
      select: { id: true, name: true },
    });

    const byApi: Map<string, { name: string; sub: number }> = new Map();
    for (const api of apis) {
      byApi.set(api.id, { name: api.name, sub: 0 });
    }

    // Get all successful payments in date range and attribute by apiId in notes (or subscriptionId -> apiId for existing subs)
    const subscriptions = await prisma.subscription.findMany({
      where: {
        apiPlan: {
          apiId: { in: apiIds },
        },
      },
      select: { id: true, apiPlan: { select: { apiId: true } } },
    });
    const subscriptionToApiMap = new Map<string, string>();
    for (const sub of subscriptions) {
      subscriptionToApiMap.set(sub.id, sub.apiPlan.apiId);
    }

    const paidPayments = await prisma.payment.findMany({
      where: {
        status: "SUCCEEDED",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        invoice: {
          status: "PAID",
        },
      },
      include: {
        invoice: true,
      },
    });

    for (const payment of paidPayments) {
      const payload = payment.payload as RazorpayPayload | null;
      const notes: PaymentNotes = payload?.notes || (payload as unknown as PaymentNotes) || {};
      const apiIdFromNotes = notes?.apiId;
      const apiIdFromInvoice = (payment.invoice as { apiId?: string } | null)?.apiId ?? null;
      const subscriptionId = notes?.subscriptionId;

      const apiId =
        (apiIdFromNotes && apiIds.includes(apiIdFromNotes) ? apiIdFromNotes : null) ||
        (apiIdFromInvoice && apiIds.includes(apiIdFromInvoice) ? apiIdFromInvoice : null) ||
        (subscriptionId ? subscriptionToApiMap.get(subscriptionId) : undefined);

      if (apiId) {
        const current = byApi.get(apiId);
        if (current) {
          current.sub += payment.amount;
          byApi.set(apiId, current);
        }
      }
    }

    return Array.from(byApi.entries()).map(([apiId, data]) => ({
      apiId,
      apiName: data.name,
      revenue: data.sub,
      subscriptionRevenue: data.sub,
    }));
  }

  /**
   * Format date for grouping
   */
  private formatDate(date: Date, groupBy: "day" | "month"): string {
    if (groupBy === "month") {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  /**
   * Get provider ID for a user (if they are a provider)
   */
  async getProviderIdForUser(userId: string): Promise<string | null> {
    const provider = await prisma.apiProvider.findUnique({
      where: { userId },
      select: { id: true },
    });
    return provider?.id || null;
  }

  /**
   * Get sales history for a provider (who bought their APIs)
   */
  async getProviderSales(providerId: string, startDate?: Date, endDate?: Date) {
    const provider = await prisma.apiProvider.findUnique({
      where: { id: providerId },
      include: {
        apis: {
          select: { id: true },
        },
      },
    });

    if (!provider) {
      throw new AppError("Provider not found", 404);
    }

    const apiIds = provider.apis.map((api) => api.id);

    if (apiIds.length === 0) {
      return [];
    }

    const now = new Date();
    const start = startDate || new Date(now.getTime() - MS.MONTH_90); // Default: last 90 days
    const end = endDate || now;

    // Get all subscriptions for this provider's APIs with payment info
    const subscriptions = await prisma.subscription.findMany({
      where: {
        apiPlan: {
          apiId: { in: apiIds },
        },
        startedAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        apiPlan: {
          include: {
            api: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    // Get payment info for these subscriptions
    const subscriptionIds = subscriptions.map((s) => s.id);

    // Find payments that have subscriptionId in their notes
    const payments = await prisma.payment.findMany({
      where: {
        status: "SUCCEEDED",
        invoice: {
          status: "PAID",
        },
      },
      select: {
        id: true,
        amount: true,
        currency: true,
        createdAt: true,
        payload: true,
      },
    });

    // Create a map of subscriptionId -> payment
    const paymentBySubscription: Map<string, { amount: number; currency: string; paidAt: Date }> = new Map();
    for (const payment of payments) {
      const payload = payment.payload as RazorpayPayload | null;
      const notes: PaymentNotes = payload?.notes || (payload as unknown as PaymentNotes) || {};
      const subscriptionId = notes?.subscriptionId;
      if (subscriptionId && subscriptionIds.includes(subscriptionId)) {
        paymentBySubscription.set(subscriptionId, {
          amount: payment.amount,
          currency: payment.currency,
          paidAt: payment.createdAt,
        });
      }
    }

    // Build the sales list
    return subscriptions.map((sub) => {
      const payment = paymentBySubscription.get(sub.id);
      return {
        subscriptionId: sub.id,
        subscribedAt: sub.startedAt,
        status: sub.status,
        customer: {
          id: sub.user.id,
          email: sub.user.email,
          name: sub.user.name,
        },
        api: {
          id: sub.apiPlan.api.id,
          name: sub.apiPlan.api.name,
          slug: sub.apiPlan.api.slug,
        },
        plan: {
          id: sub.apiPlan.id,
          name: sub.apiPlan.name,
          billingType: sub.apiPlan.billingType,
          priceMonthly: sub.apiPlan.priceMonthly,
          freeTier: sub.apiPlan.freeTier,
        },
        payment: payment || null,
      };
    });
  }

  /**
   * Get global finance details for admin
   */
  async getAdminFinanceDetails() {
    const now = new Date();
    const startOfLoggedMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalRevenue,
      monthlyRevenue,
      invoiceStatuses,
      recentInvoices,
    ] = await Promise.all([
      // Total platform revenue from all paid invoices
      prisma.invoice.aggregate({
        where: { status: "PAID" },
        _sum: { amount: true },
      }),
      // Revenue this month
      prisma.invoice.aggregate({
        where: {
          status: "PAID",
          createdAt: { gte: startOfLoggedMonth }
        },
        _sum: { amount: true },
      }),
      // Invoice counts by status
      prisma.invoice.groupBy({
        by: ["status"],
        _count: { _all: true },
        _sum: { amount: true },
      }),
      // 10 most recent invoices
      prisma.invoice.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { email: true, name: true } },
          subscription: {
            include: {
              apiPlan: {
                include: { api: { select: { name: true } } }
              }
            }
          }
        }
      })
    ]);

    return {
      totalRevenue: totalRevenue._sum?.amount || 0,
      monthlyRevenue: monthlyRevenue._sum?.amount || 0,
      invoiceStatuses: invoiceStatuses.map(s => ({
        status: s.status,
        count: s._count._all,
        total: s._sum?.amount || 0
      })),
      recentInvoices: recentInvoices.map(inv => ({
        id: inv.id,
        amount: inv.amount,
        status: inv.status,
        createdAt: inv.createdAt,
        userName: inv.user?.name || inv.user?.email,
        apiName: (inv.subscription as { apiPlan?: { api?: { name?: string } } } | null)?.apiPlan?.api?.name || "N/A"
      }))
    };
  }
}
