import { prisma } from "../../config/prisma";
import { logger } from "../../common/logger";

export type AuditAction =
  | "USER_REGISTERED"
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "API_KEY_CREATED"
  | "API_KEY_REVOKED"
  | "API_KEY_DELETED"
  | "API_KEY_REGENERATED"
  | "SUBSCRIPTION_CREATED"
  | "SUBSCRIPTION_CANCELLED"
  | "PAYMENT_SUCCEEDED"
  | "PASSWORD_CHANGED"
  | "PROFILE_UPDATED";

export interface AuditLogParams {
  userId?: string | null;
  action: AuditAction | string;
  entity?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
}

const auditService = {
  /**
   * Record an audit event. Fire-and-forget; never throws to avoid breaking main flow.
   */
  async log(params: AuditLogParams): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: params.userId ?? null,
          action: params.action,
          entity: params.entity ?? null,
          entityId: params.entityId ?? null,
          metadata: (params.metadata ?? undefined) as never,
        },
      });
    } catch (err) {
      logger.error("Audit log write failed", { error: err, params });
    }
  },
};

export const auditLog = auditService;
