import { Queue, Worker, type ConnectionOptions } from "bullmq";
import { redisClient } from "../config/redis";
import { prisma } from "../config/prisma";
import { BillingService } from "../modules/billing/billing.service";
import { logger } from "../common/logger";
import { RazorpayPayload, MS } from "../common/types";

// BullMQ expects IORedis-compatible connection; redis v4 client works at runtime
const connection = redisClient.duplicate() as unknown as ConnectionOptions;

export const paymentRetryQueue = new Queue("payment-retry", {
  connection,
});

const billingService = new BillingService();

/**
 * Worker to automatically retry failed payments
 * Processes failed payments that are eligible for retry
  */
export const paymentRetryWorker = new Worker(
  "payment-retry",
  async (job) => {
    const { paymentId } = job.data;

    try {
      const result = await billingService.retryFailedPayment(paymentId);
      logger.info(`Payment retry successful for payment ${paymentId}`);
      return { success: true, ...result };
    } catch (error: unknown) {
      logger.error(`Payment retry failed for payment ${paymentId}`, error);

      // Check if max retries reached
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { invoice: true },
      });

      if (payment && payment.retryCount >= payment.maxRetries) {
        logger.warn(`Payment ${paymentId} reached max retries (${payment.maxRetries}), marking as permanently failed`);

        // Update invoice to FAILED if all retries exhausted
        await prisma.invoice.update({
          where: { id: payment.invoiceId },
          data: { status: "FAILED" },
        });

        // Handle subscription suspension
        const invoiceNotes = (payment.payload as RazorpayPayload)?.notes;
        const subscriptionId = invoiceNotes?.subscriptionId;
        if (subscriptionId) {
          const subscription = await prisma.subscription.findUnique({
            where: { id: subscriptionId },
          });
          if (subscription && subscription.status === "ACTIVE") {
            await prisma.subscription.update({
              where: { id: subscription.id },
              data: { status: "EXPIRED" },
            });
            logger.info(`Subscription ${subscriptionId} marked as EXPIRED after max retries`);
          }
        }
      }

      throw error;
    }
  },
  { connection }
);

/**
 * Schedule retry jobs for all eligible failed payments
 * Runs daily to retry failed payments
 */
export async function schedulePaymentRetries() {
  const failedPayments = await billingService.getFailedPaymentsEligibleForRetry();

  for (const payment of failedPayments) {
    await paymentRetryQueue.add(
      `retry-${payment.id}`,
      { paymentId: payment.id },
      {
        jobId: `retry-${payment.id}-${Date.now()}`,
        removeOnComplete: true,
        delay: MS.DAY, // Delay 24 hours from last retry
      }
    );
  }

  logger.info(`Scheduled ${failedPayments.length} payment retry jobs`);
}

