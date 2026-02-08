import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { authenticateJWT } from "../auth/middleware/authenticate";
import { requireRole } from "../rbac/middleware/rbac";
import { ApisService } from "./apis.service";

const router = Router();
const service = new ApisService();

const createApiSchema = z.object({
  name: z.string().min(3).max(100),
  slug: z.string().min(3).max(80),
  baseUrl: z.string().url(),
  category: z.string().max(60).optional(),
  description: z.string().max(150).optional(),
  providerDisplayName: z.string().max(80).optional(),
  documentation: z.string().optional(),
  authenticationMethod: z.literal("API Key").optional(),
  rateLimits: z.string().max(150).optional(),
  // Coerce from string so form submissions like "60" work
  publicRateLimitPerMinute: z.coerce.number().int().positive().optional(),
});

const updateApiSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  baseUrl: z.string().url().optional(),
  category: z.string().max(60).optional(),
  description: z.string().max(150).optional(),
  documentation: z.string().optional().nullable(),
  authenticationMethod: z.union([z.literal("API Key"), z.null()]).optional(),
  rateLimits: z.string().max(150).optional().nullable(),
  // Coerce from string so form submissions like "60" work
  publicRateLimitPerMinute: z.coerce.number().int().positive().optional().nullable(),
});

const planSchema = z.object({
  name: z.string().max(60),
  description: z.string().max(150).optional(),
  billingType: z.enum(["SUBSCRIPTION", "FREE"]),
  priceMonthly: z.number().int().nonnegative().nullable().optional(),
  freeTier: z.boolean().optional(),
  monthlyQuota: z.number().int().positive().nullable().optional(),
});

const changeStatusSchema = z.object({
  status: z.enum(["DRAFT", "REVIEW", "APPROVED", "LIVE", "SUSPENDED"]),
});

// Provider routes (must be authenticated APIProvider)

// Get provider's own APIs
router.get(
  "/provider/apis",
  authenticateJWT,
  requireRole("User"),
  async (req, res, next) => {
    try {
      const apis = await service.listProviderApis(req.user!.sub);
      res.json({ success: true, apis });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/provider/apis",
  authenticateJWT,
  requireRole("User"),
  async (req, res, next) => {
    try {
      const body = createApiSchema.parse(req.body);
      const api = await service.createApi({
        userId: req.user!.sub,
        ...body,
      });
      res.status(201).json({ success: true, api });
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  "/provider/apis/:id",
  authenticateJWT,
  requireRole("User"),
  async (req, res, next) => {
    try {
      const body = updateApiSchema.parse(req.body);
      const api = await service.updateApi(req.params.id, req.user!.sub, body);
      res.json({ success: true, api });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/provider/apis/:id/plans",
  authenticateJWT,
  requireRole("User"),
  async (req, res, next) => {
    try {
      const body = planSchema.parse(req.body);
      const plan = await service.addPlan(req.params.id, body);
      res.status(201).json({ success: true, plan });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/provider/apis/plans/:planId",
  authenticateJWT,
  requireRole("User"),
  async (req, res, next) => {
    try {
      await service.deletePlan(req.params.planId, req.user!.sub);
      res.json({ success: true, message: "Plan deleted successfully" });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/provider/apis/:id",
  authenticateJWT,
  requireRole("User"),
  async (req, res, next) => {
    try {
      const api = await service.getProviderApiById(req.params.id, req.user!.sub);
      res.json({ success: true, api });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/provider/apis/:id/overview",
  authenticateJWT,
  requireRole("User"),
  async (req, res, next) => {
    try {
      const api = await service.getProviderApiOverview(req.params.id, req.user!.sub);
      res.json({ success: true, api });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/provider/apis/:id/plans",
  authenticateJWT,
  requireRole("User"),
  async (req, res, next) => {
    try {
      const api = await service.getProviderApiPlans(req.params.id, req.user!.sub);
      res.json({ success: true, api });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/provider/apis/:id/docs",
  authenticateJWT,
  requireRole("User"),
  async (req, res, next) => {
    try {
      const api = await service.getProviderApiDocs(req.params.id, req.user!.sub);
      res.json({ success: true, api });
    } catch (err) {
      next(err);
    }
  }
);

// Lifecycle transitions (provider submit, admin approve/publish/suspend)
router.post(
  "/provider/apis/:id/submit-for-review",
  authenticateJWT,
  requireRole("User"),
  async (req, res, next) => {
    try {
      const api = await service.changeStatus(req.params.id, "REVIEW");
      res.json({ success: true, api });
    } catch (err) {
      next(err);
    }
  }
);

// Admin: Get all APIs with optional status filter
router.get(
  "/admin/apis",
  authenticateJWT,
  requireRole("SuperAdmin"),
  async (req, res, next) => {
    try {
      const status = req.query.status as string | undefined;
      const apis = await service.adminGetApis(status);
      res.json({ success: true, apis });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/admin/apis/:id",
  authenticateJWT,
  requireRole("SuperAdmin"),
  async (req, res, next) => {
    try {
      const api = await service.adminGetApiById(req.params.id);
      res.json({ success: true, api });
    } catch (err) {
      next(err);
    }
  }
);

const updateStatusHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status } = changeStatusSchema.parse(req.body);
    await service.changeStatus(req.params.id, status);
    const api = await service.adminGetApiById(req.params.id);
    res.json({ success: true, api });
  } catch (err) {
    next(err);
  }
};

router.patch(
  "/admin/apis/:id/status",
  authenticateJWT,
  requireRole("SuperAdmin"),
  updateStatusHandler
);

router.post(
  "/admin/apis/:id/status",
  authenticateJWT,
  requireRole("SuperAdmin"),
  updateStatusHandler
);

router.post(
  "/admin/apis/:id/approve",
  authenticateJWT,
  requireRole("SuperAdmin"),
  async (req, res, next) => {
    try {
      const api = await service.changeStatus(req.params.id, "APPROVED");
      res.json({ success: true, api });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/admin/apis/:id/publish",
  authenticateJWT,
  requireRole("SuperAdmin"),
  async (req, res, next) => {
    try {
      const api = await service.changeStatus(req.params.id, "LIVE");
      res.json({ success: true, api });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/admin/apis/:id/suspend",
  authenticateJWT,
  requireRole("SuperAdmin"),
  async (req, res, next) => {
    try {
      const api = await service.changeStatus(req.params.id, "SUSPENDED");
      res.json({ success: true, api });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/admin/apis/:id/activate",
  authenticateJWT,
  requireRole("SuperAdmin"),
  async (req, res, next) => {
    try {
      const api = await service.changeStatus(req.params.id, "LIVE");
      res.json({ success: true, api });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/admin/apis/:id/reject",
  authenticateJWT,
  requireRole("SuperAdmin"),
  async (req, res, next) => {
    try {
      const api = await service.changeStatus(req.params.id, "DRAFT");
      res.json({ success: true, api });
    } catch (err) {
      next(err);
    }
  }
);

// Public consumer routes – list APIs with pagination
router.get("/apis", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 12));
    const offset = (page - 1) * limit;

    const { apis, total } = await service.listPublicApis({
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      category:
        typeof req.query.category === "string" ? req.query.category : undefined,
      limit,
      offset,
    });

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const pagination = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    res.json({ success: true, apis, total, pagination });
  } catch (err) {
    next(err);
  }
});

router.get("/apis/:id", async (req, res, next) => {
  try {
    const api = await service.getPublicApiById(req.params.id);
    res.json({ success: true, api });
  } catch (err) {
    next(err);
  }
});

export const apisRouter = router;

