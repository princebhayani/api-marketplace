import { Router } from "express";
import { z } from "zod";
import { authenticateJWT } from "../auth/middleware/authenticate";
import { prisma } from "../../config/prisma";

const router = Router();

const listQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  cursor: z.string().uuid().optional(),
});

/**
 * GET /audit-logs
 * List audit logs for the current user. Paginated by cursor.
 */
router.get("/", authenticateJWT, async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const userId = req.user!.sub;

    const logs = await prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: query.limit + 1,
      ...(query.cursor
        ? { cursor: { id: query.cursor }, skip: 1 }
        : {}),
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        metadata: true,
        createdAt: true,
      },
    });

    const hasMore = logs.length > query.limit;
    const items = hasMore ? logs.slice(0, query.limit) : logs;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    res.json({
      success: true,
      logs: items,
      nextCursor,
      hasMore,
    });
  } catch (err) {
    next(err);
  }
});

export const auditRouter = router;
