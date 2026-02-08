import { Prisma } from "@prisma/client";

import { AppError } from "../../common/middleware/errorHandler";
import { logger } from "../../common/logger";
import { prisma } from "../../config/prisma";
import { NotificationService } from "../notifications/notification.service";

const notificationService = new NotificationService();

export class ApisService {
  private readonly DEFAULT_AUTH_METHOD = "API Key";

  private safeNotify(action: () => Promise<void>, errorMessage: string): void {
    action().catch((err) => logger.error(errorMessage, err));
  }

  async createProviderIfMissing(userId: string, displayName?: string): Promise<any> {
    const existing = await prisma.apiProvider.findUnique({ where: { userId } });
    if (existing) return existing;
    if (!displayName) {
      throw new AppError("Provider displayName is required for first API", 400);
    }
    return prisma.apiProvider.create({
      data: {
        userId,
        displayName,
      },
    });
  }

  async createApi(params: {
    userId: string;
    name: string;
    slug: string;
    baseUrl: string;
    category?: string;
    description?: string;
    providerDisplayName?: string;
    documentation?: string;
    authenticationMethod?: string;
    rateLimits?: string;
    publicRateLimitPerMinute?: number;
  }): Promise<unknown> {
    // Check if slug already exists
    const existingApi = await prisma.api.findUnique({
      where: { slug: params.slug },
    });
    if (existingApi) {
      throw new AppError(`An API with the slug "${params.slug}" already exists. Please choose a different slug.`, 409);
    }

    const provider = await this.createProviderIfMissing(
      params.userId,
      params.providerDisplayName ?? params.name
    );

    try {
      return await prisma.api.create({
        data: {
          providerId: provider.id,
          name: params.name,
          slug: params.slug,
          baseUrl: params.baseUrl,
          category: params.category,
          description: params.description,
          documentation: params.documentation,
          authenticationMethod: this.DEFAULT_AUTH_METHOD,
          rateLimits: params.rateLimits,
          publicRateLimitPerMinute: params.publicRateLimitPerMinute,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const target = error.meta?.target as string[] | undefined;
        if (target?.includes("slug")) {
          throw new AppError(
            `An API with the slug "${params.slug}" already exists. Please choose a different slug.`,
            409
          );
        }
        throw new AppError("A record with this information already exists", 409);
      }
      throw error;
    }
  }

  async updateApi(
    apiId: string,
    userId: string,
    params: {
      name?: string;
      baseUrl?: string;
      category?: string;
      description?: string;
      documentation?: string | null;
      authenticationMethod?: string | null;
      rateLimits?: string | null;
      publicRateLimitPerMinute?: number | null;
    }
  ): Promise<unknown> {
    // Verify the API belongs to the user
    const provider = await prisma.apiProvider.findUnique({ where: { userId } });
    if (!provider) {
      throw new AppError("Provider not found", 404);
    }

    const api = await prisma.api.findUnique({
      where: { id: apiId },
    });

    if (!api) {
      throw new AppError("API not found", 404);
    }

    if (api.providerId !== provider.id) {
      throw new AppError("You don't have permission to update this API", 403);
    }

    // Allow editing for all statuses - providers can update their API details anytime
    return prisma.api.update({
      where: { id: apiId },
      data: {
        ...(params.name && { name: params.name }),
        ...(params.baseUrl && { baseUrl: params.baseUrl }),
        ...(params.category !== undefined && { category: params.category }),
        ...(params.description !== undefined && { description: params.description }),
        ...(params.documentation !== undefined && { documentation: params.documentation }),
        ...(params.authenticationMethod !== undefined && { authenticationMethod: this.DEFAULT_AUTH_METHOD }),
        ...(params.rateLimits !== undefined && { rateLimits: params.rateLimits }),
        ...(params.publicRateLimitPerMinute !== undefined && {
          publicRateLimitPerMinute: params.publicRateLimitPerMinute,
        }),
      },
    });
  }

  async getProviderApiById(apiId: string, userId: string): Promise<unknown> {
    const provider = await prisma.apiProvider.findUnique({ where: { userId } });
    if (!provider) throw new AppError("Provider workspace not found.", 403);

    const api = await prisma.api.findFirst({
      where: { id: apiId, providerId: provider.id },
      include: {
        plans: true,
        provider: true,
      },
    });

    if (!api) throw new AppError("API not found", 404);
    return api;
  }

  async getProviderApiOverview(apiId: string, userId: string): Promise<unknown> {
    const provider = await prisma.apiProvider.findUnique({ where: { userId } });
    if (!provider) throw new AppError("Provider workspace not found.", 403);

    const api = await prisma.api.findFirst({
      where: { id: apiId, providerId: provider.id },
      include: {
        _count: {
          select: { plans: true },
        },
        plans: {
          take: 4,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!api) throw new AppError("API not found", 404);

    // Fetch stats
    const totalSubs = await prisma.subscription.count({
      where: { apiPlan: { apiId }, status: "ACTIVE" },
    });

    return {
      ...api,
      stats: {
        totalSubs,
        uptime: "100%", // Logic for uptime can be added later
        version: "v1.0.0",
      },
    };
  }

  async getProviderApiPlans(apiId: string, userId: string): Promise<unknown> {
    const provider = await prisma.apiProvider.findUnique({ where: { userId } });
    if (!provider) throw new AppError("Provider workspace not found.", 403);

    const api = await prisma.api.findFirst({
      where: { id: apiId, providerId: provider.id },
      select: {
        id: true,
        name: true,
        status: true,
        description: true,
        plans: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!api) throw new AppError("API not found", 404);
    return api;
  }

  async getProviderApiDocs(apiId: string, userId: string): Promise<unknown> {
    const provider = await prisma.apiProvider.findUnique({ where: { userId } });
    if (!provider) throw new AppError("Provider workspace not found.", 403);

    const api = await prisma.api.findFirst({
      where: { id: apiId, providerId: provider.id },
      select: {
        id: true,
        name: true,
        status: true,
        description: true,
        documentation: true,
      },
    });

    if (!api) throw new AppError("API not found", 404);
    return api;
  }

  async listProviderApis(userId: string): Promise<unknown[]> {
    const provider = await prisma.apiProvider.findUnique({ where: { userId } });
    if (!provider) {
      return [];
    }
    const apis = await prisma.api.findMany({
      where: { providerId: provider.id },
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
      orderBy: { createdAt: "desc" },
    });

    const apiIds = apis.map((a) => a.id);
    if (apiIds.length === 0) return apis;

    const countsByPlan = await prisma.subscription.groupBy({
      by: ["apiPlanId"],
      where: {
        status: "ACTIVE",
        apiPlan: { apiId: { in: apiIds } },
      },
      _count: { id: true },
    });

    const planToCount = new Map(countsByPlan.map((c) => [c.apiPlanId, c._count.id]));

    return apis.map((api) => {
      const activeSubscriptionsCount = (api.plans as { id: string }[])
        .reduce((sum, plan) => sum + (planToCount.get(plan.id) ?? 0), 0);
      return { ...api, activeSubscriptionsCount };
    });
  }

  async listAllApis(status?: string): Promise<unknown[]> {
    const whereClause: any = status ? { status } : {};
    return prisma.api.findMany({
      where: whereClause,
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
        provider: {
          include: {
            user: {
              select: { id: true, email: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async addPlan(
    apiId: string,
    data: {
      name: string;
      description?: string;
      billingType: "SUBSCRIPTION" | "FREE";
      priceMonthly?: number | null;
      freeTier?: boolean;
      monthlyQuota?: number | null;
    }
  ): Promise<unknown> {
    // For FREE plans, ensure priceMonthly is 0 or null
    let finalPriceMonthly = data.priceMonthly ?? null;
    if (data.billingType === "FREE") {
      finalPriceMonthly = 0;
    }

    return prisma.apiPlan.create({
      data: {
        apiId,
        name: data.name,
        description: data.description,
        billingType: data.billingType,
        priceMonthly: finalPriceMonthly,
        freeTier: data.freeTier ?? false,
        monthlyQuota: data.monthlyQuota ?? null,
      },
    });
  }

  async deletePlan(planId: string, userId: string): Promise<unknown> {
    // Verify the plan belongs to the user's API
    const provider = await prisma.apiProvider.findUnique({ where: { userId } });
    if (!provider) {
      throw new AppError("Provider not found", 404);
    }

    const plan = await prisma.apiPlan.findUnique({
      where: { id: planId },
      include: {
        api: true,
        subscriptions: true,
      },
    });

    if (!plan) {
      throw new AppError("Plan not found", 404);
    }

    if (plan.api.providerId !== provider.id) {
      throw new AppError("You don't have permission to delete this plan", 403);
    }

    // Check if there are active subscriptions
    const activeSubscriptions = plan.subscriptions.filter(
      (sub) => sub.status === "ACTIVE"
    );
    if (activeSubscriptions.length > 0) {
      throw new AppError(
        `Cannot delete plan: ${activeSubscriptions.length} active subscription(s) exist. Please cancel all subscriptions first.`,
        400
      );
    }

    return prisma.apiPlan.delete({
      where: { id: planId },
    });
  }

  async changeStatus(
    apiId: string,
    status: "REVIEW" | "APPROVED" | "LIVE" | "SUSPENDED" | "DRAFT"
  ): Promise<unknown> {
    const api = await prisma.api.findUnique({
      where: { id: apiId },
      include: {
        provider: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!api) {
      throw new AppError("API not found", 404);
    }

    const updated = await prisma.api.update({
      where: { id: apiId },
      data: { status },
    });

    // Send notification emails
    if (api.provider?.user) {
      const providerUser = api.provider.user;
      const userId = providerUser.id;
      const email = providerUser.email;
      const apiName = api.name;

      switch (status) {
        case "APPROVED":
          this.safeNotify(
            () => notificationService.sendApiApprovedEmail(userId, email, apiName),
            "Failed to send API approved email"
          );
          break;

        case "SUSPENDED":
          this.safeNotify(
            () => notificationService.sendApiRejectedEmail(userId, email, apiName, "API suspended"),
            "Failed to send API suspended email"
          );
          break;

        case "DRAFT":
          this.safeNotify(
            () => notificationService.sendApiRejectedEmail(userId, email, apiName, "API rejected from review"),
            "Failed to send API rejected email"
          );
          break;

        case "LIVE":
          if (api.status === "SUSPENDED") {
            this.safeNotify(
              () => notificationService.sendApiApprovedEmail(userId, email, apiName),
              "Failed to send API reactivated email"
            );
          }
          break;

        default:
          break;
      }
    }

    return updated;
  }

  async listPublicApis(query?: {
    search?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ apis: unknown[]; total: number }> {
    const where: Record<string, unknown> = { status: "LIVE" };
    if (query?.category) {
      where.category = query.category;
    }
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const limit = Math.min(Math.max(query?.limit ?? 12, 1), 100);
    const offset = Math.max(query?.offset ?? 0, 0);

    const [apis, total] = await Promise.all([
      prisma.api.findMany({
        where: where as any,
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
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.api.count({ where: where as any }),
    ]);

    return { apis, total };
  }

  async getPublicApiById(id: string): Promise<unknown> {
    const api = await prisma.api.findUnique({
      where: { id, status: "LIVE" },
      include: { plans: true, provider: true },
    });
    if (!api) throw new AppError("API not found", 404);
    return api;
  }

  async adminGetApis(status?: string): Promise<unknown[]> {
    const where: any = status ? { status } : {};

    return prisma.api.findMany({
      where,
      include: {
        provider: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        plans: true,
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async adminGetApiById(apiId: string): Promise<unknown> {
    const api = await prisma.api.findUnique({
      where: { id: apiId },
      include: {
        provider: { include: { user: { select: { id: true, email: true, name: true } } } },
        plans: true,
      },
    });
    if (!api) throw new AppError("API not found", 404);
    return api;
  }
}

