import { Router } from "express";
import { authenticateJWT } from "../auth/middleware/authenticate";
import { requireRole } from "../rbac/middleware/rbac";

const router = Router();

router.post(
  "/notifications/test-email",
  authenticateJWT,
  requireRole("SuperAdmin"),
  async (req, res, next) => {
    // Email notifications have been disabled in this project.
    // Keep the route to avoid 404s, but always inform callers that
    // email functionality is no longer available.
    return res.status(410).json({
      success: false,
      message: "Email notifications have been disabled in this deployment.",
    });
  }
);

export const notificationsRouter = router;
