import { Queue, Worker, type ConnectionOptions } from "bullmq";
import { redisClient } from "../config/redis";
import { prisma } from "../config/prisma";
import { NotificationService } from "../modules/notifications/notification.service";
import { logger } from "../common/logger";
import { MS } from "../common/types";

// BullMQ expects IORedis-compatible connection; redis v4 client works at runtime
const connection = redisClient.duplicate() as unknown as ConnectionOptions;

export const subscriptionExpiryQueue = new Queue("subscription-expiry", {
  connection,
});

const notificationService = new NotificationService();

/**
 * Worker to check for expiring subscriptions and send warnings
 */
export const subscriptionExpiryWorker = new Worker(
  "subscription-expiry",
  async () => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + MS.WEEK);
    const threeDaysFromNow = new Date(now.getTime() + 3 * MS.DAY);
    const oneDayFromNow = new Date(now.getTime() + MS.DAY);

    // Find subscriptions expiring soon
    const expiringSubscriptions = await prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        endsAt: {
          not: null,
          gte: now,
          lte: sevenDaysFromNow,
        },
      },
      include: {
        user: true,
        apiPlan: {
          include: {
            api: true,
          },
        },
      },
    });

    for (const subscription of expiringSubscriptions) {
      if (!subscription.endsAt) continue;

      const daysRemaining = Math.ceil(
        (subscription.endsAt.getTime() - now.getTime()) / MS.DAY
      );

      // Send warning emails at 7 days, 3 days, and 1 day before expiry
      if (daysRemaining === 7 || daysRemaining === 3 || daysRemaining === 1) {
        try {
          await notificationService.sendSubscriptionExpiringEmail(
            subscription.userId,
            subscription.user.email,
            subscription.apiPlan.api.name,
            daysRemaining
          );
          logger.info(
            `Sent expiry warning for subscription ${subscription.id}, ${daysRemaining} days remaining`
          );
        } catch (error) {
          logger.error(`Failed to send expiry warning for subscription ${subscription.id}`, error);
        }
      }

      // Mark subscription as expired if past end date
      if (subscription.endsAt <= now && subscription.status === "ACTIVE") {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: "EXPIRED" },
        });
        logger.info(`Subscription ${subscription.id} marked as EXPIRED`);
      }
    }

    return { processed: expiringSubscriptions.length };
  },
  { connection }
);

/**
 * Schedule daily subscription expiry checks
 */
export async function scheduleSubscriptionExpiryChecks() {
  await subscriptionExpiryQueue.add(
    "check-expiring-subscriptions",
    {},
    {
      jobId: `expiry-check-${Date.now()}`,
      removeOnComplete: true,
    }
  );
  logger.info("Scheduled subscription expiry check");
}
