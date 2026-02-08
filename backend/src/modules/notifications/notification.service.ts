import { logger } from "../../common/logger";

export type NotificationEvent =
  | "user.registered"
  | "payment.succeeded"
  | "payment.failed"
  | "subscription.suspended"
  | "subscription.cancelled"
  | "subscription.expiring"
  | "api.approved"
  | "api.rejected"
  | "usage.limit_warning";

export interface NotificationPayload {
  userId: string;
  email: string;
  event: NotificationEvent;
  data: Record<string, unknown>;
}

export class NotificationService {
  /**
   * Email notifications have been disabled.
   * This service is now a no-op that preserves the public API
   * so other modules can continue calling it safely.
   */
  async sendNotification(payload: NotificationPayload): Promise<boolean> {
    logger.info(
      `Email notifications are disabled; skipping event ${payload.event} for ${payload.email}`
    );
    return false;
  }

  /**
   * Queue notification for background processing (no-op)
   */
  async queueNotification(payload: NotificationPayload): Promise<void> {
    logger.info(
      `Email notifications are disabled; not enqueuing event ${payload.event} for ${payload.email}`
    );
  }

  /**
   * Send welcome email after user registration
   */
  async sendWelcomeEmail(userId: string, email: string, name?: string | null): Promise<void> {
    logger.info(
      `Email notifications are disabled; skipping welcome email for user ${userId} (${email})`
    );
  }

  /**
   * Send payment success notification
   */
  async sendPaymentSuccessEmail(
    userId: string,
    email: string,
    amount: number,
    invoiceId: string,
    currency: string = "INR"
  ): Promise<void> {
    logger.info(
      `Email notifications are disabled; skipping payment success email for user ${userId} (${email})`
    );
  }

  /**
   * Send payment failure notification
   */
  async sendPaymentFailedEmail(
    userId: string,
    email: string,
    amount: number,
    invoiceId: string,
    retryCount: number = 0,
    currency: string = "INR"
  ): Promise<void> {
    logger.info(
      `Email notifications are disabled; skipping payment failure email for user ${userId} (${email})`
    );
  }

  /**
   * Send subscription suspended notification
   */
  async sendSubscriptionSuspendedEmail(
    userId: string,
    email: string,
    apiName: string,
    reason: string = "Payment failure"
  ): Promise<void> {
    logger.info(
      `Email notifications are disabled; skipping subscription suspended email for user ${userId} (${email})`
    );
  }

  /**
   * Send subscription cancelled notification
   */
  async sendSubscriptionCancelledEmail(
    userId: string,
    email: string,
    apiName: string
  ): Promise<void> {
    logger.info(
      `Email notifications are disabled; skipping subscription cancelled email for user ${userId} (${email})`
    );
  }

  /**
   * Send subscription expiring warning
   */
  async sendSubscriptionExpiringEmail(
    userId: string,
    email: string,
    apiName: string,
    daysRemaining: number
  ): Promise<void> {
    logger.info(
      `Email notifications are disabled; skipping subscription expiring email for user ${userId} (${email}), ${daysRemaining} days remaining`
    );
  }

  /**
   * Send API approved notification
   */
  async sendApiApprovedEmail(userId: string, email: string, apiName: string): Promise<void> {
    logger.info(
      `Email notifications are disabled; skipping API approved email for user ${userId} (${email})`
    );
  }

  /**
   * Send API rejected notification
   */
  async sendApiRejectedEmail(
    userId: string,
    email: string,
    apiName: string,
    reason?: string
  ): Promise<void> {
    logger.info(
      `Email notifications are disabled; skipping API rejected email for user ${userId} (${email})`
    );
  }

  /**
   * Send usage limit warning
   */
  async sendUsageLimitWarningEmail(
    userId: string,
    email: string,
    apiName: string,
    usagePercent: number
  ): Promise<void> {
    logger.info(
      `Email notifications are disabled; skipping usage limit warning email for user ${userId} (${email})`
    );
  }
}
