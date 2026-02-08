import { Worker, type ConnectionOptions } from "bullmq";
import { redisClient } from "../config/redis";
import { logger } from "../common/logger";
import { emailQueue } from "./email.queue";

// Lazy-load NotificationService to avoid circular import
let notificationService: import("../modules/notifications/notification.service").NotificationService | null = null;

async function getNotificationService() {
  if (!notificationService) {
    const { NotificationService } = await import("../modules/notifications/notification.service");
    notificationService = new NotificationService();
  }
  return notificationService;
}

export { emailQueue };

// BullMQ expects IORedis-compatible connection; redis v4 client works at runtime
const connection = redisClient.duplicate() as unknown as ConnectionOptions;

/**
 * Worker to process email notifications in the background
 */
export const emailWorker = new Worker(
  "email-notifications",
  async (job) => {
    const payload = job.data as import("../modules/notifications/notification.service").NotificationPayload;
    
    try {
      logger.info(`Processing email notification: ${payload.event} for ${payload.email}`);
      const svc = await getNotificationService();
      const success = await svc.sendNotification(payload);
      
      if (!success) {
        logger.warn(`Email notification failed: ${payload.event} for ${payload.email}`);
      }
      
      return { success };
    } catch (error) {
      logger.error(`Email notification job failed: ${payload.event}`, error);
      throw error;
    }
  },
  { connection }
);
