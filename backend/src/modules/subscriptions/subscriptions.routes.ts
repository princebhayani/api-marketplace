import { Router } from "express";
import { z } from "zod";
import { authenticateJWT } from "../auth/middleware/authenticate";
import { SubscriptionsService } from "./subscriptions.service";

const router = Router();
const service = new SubscriptionsService();

const subscribeSchema = z.object({
  apiPlanId: z.string().uuid(),
});

const createKeySchema = z.object({
  label: z.string().optional(),
});

router.post("/", authenticateJWT, async (req, res, next) => {
  try {
    const body = subscribeSchema.parse(req.body);
    const { subscription } = await service.subscribe(req.user!.sub, body.apiPlanId);
    res.status(201).json({ success: true, subscription });
  } catch (err) {
    next(err);
  }
});

router.get("/me", authenticateJWT, async (req, res, next) => {
  try {
    const subs = await service.listUserSubscriptions(req.user!.sub);
    res.json({ success: true, subscriptions: subs });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/keys", authenticateJWT, async (req, res, next) => {
  try {
    const body = createKeySchema.parse(req.body);
    const key = await service.createApiKey(req.params.id, body.label);
    res.status(201).json({ success: true, key });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/keys/:keyId/regenerate", authenticateJWT, async (req, res, next) => {
  try {
    const key = await service.regenerateKey(req.params.id, req.params.keyId);
    res.json({ success: true, key });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/keys/:keyId/revoke", authenticateJWT, async (req, res, next) => {
  try {
    const key = await service.revokeKey(req.params.id, req.params.keyId);
    res.json({ success: true, key });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/keys/:keyId", authenticateJWT, async (req, res, next) => {
  try {
    const result = await service.deleteKey(req.params.id, req.params.keyId);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/keys", authenticateJWT, async (req, res, next) => {
  try {
    const keys = await service.listKeys(req.params.id);
    res.json({ success: true, keys });
  } catch (err) {
    next(err);
  }
});

router.get("/me/usage", authenticateJWT, async (req, res, next) => {
  try {
    const usage = await service.getUsageForUser(req.user!.sub);
    res.json({ success: true, usage });
  } catch (err) {
    next(err);
  }
});

// Get user's purchase/subscription history
router.get("/me/purchases", authenticateJWT, async (req, res, next) => {
  try {
    const purchases = await service.getPurchaseHistory(req.user!.sub);
    res.json({ success: true, data: purchases });
  } catch (err) {
    next(err);
  }
});

// Get detailed usage statistics per subscription
router.get("/me/usage/detailed", authenticateJWT, async (req, res, next) => {
  try {
    const stats = await service.getDetailedUsageStats(req.user!.sub);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

// Delete a subscription
router.delete("/:id", authenticateJWT, async (req, res, next) => {
  try {
    const result = await service.deleteSubscription(req.params.id, req.user!.sub);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// Bulk delete schema
const bulkDeleteSchema = z.object({
  subscriptionIds: z.array(z.string().uuid()).min(1),
});

// Delete multiple subscriptions at once
router.post("/bulk-delete", authenticateJWT, async (req, res, next) => {
  try {
    const body = bulkDeleteSchema.parse(req.body);
    const result = await service.deleteMultipleSubscriptions(body.subscriptionIds, req.user!.sub);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

export const subscriptionsRouter = router;

