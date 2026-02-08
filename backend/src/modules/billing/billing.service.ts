import axios from "axios";
import crypto from "crypto";
import { prisma } from "../../config/prisma";
import { AppError } from "../../common/middleware/errorHandler";
import { config } from "../../config/env";
import { logger } from "../../common/logger";
import { NotificationService } from "../notifications/notification.service";
import { auditLog } from "../audit/audit.service";
import { RazorpayPayload, INVOICE_PERIOD_MS, INVOICE_DUE_MS, MS, DEFAULT_BATCH_SIZE, DEFAULT_INVOICE_LIMIT } from "../../common/types";

const RAZORPAY_BASE_URL = "https://api.razorpay.com/v1";
const notificationService = new NotificationService();

export class BillingService {
  private getRazorpayAuth() {
    if (!config.razorpayKeyId || !config.razorpayKeySecret) {
      throw new AppError("Razorpay credentials not configured", 500);
    }
    return {
      username: config.razorpayKeyId,
      password: config.razorpayKeySecret,
    };
  }

  async createSubscriptionOrder(userId: string, subscriptionId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        apiPlan: {
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
    });
    if (!subscription || subscription.userId !== userId) {
      throw new AppError("Subscription not found", 404);
    }
    if (!subscription.apiPlan.priceMonthly) {
      throw new AppError("Plan has no subscription price", 400);
    }

    const amount = subscription.apiPlan.priceMonthly;

    // Validate Razorpay credentials are configured
    if (!config.razorpayKeyId || !config.razorpayKeySecret) {
      throw new AppError("Razorpay credentials not configured", 500);
    }

    const apiId = subscription.apiPlan.apiId;
    const invoice = await prisma.invoice.create({
      data: {
        user: { connect: { id: userId } },
        subscription: { connect: { id: subscriptionId } },
        apiId,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + INVOICE_PERIOD_MS), // 30 days
        amount,
        dueDate: new Date(Date.now() + INVOICE_DUE_MS), // 7 days
        status: "PENDING",
      },
    });

    const auth = {
      username: config.razorpayKeyId,
      password: config.razorpayKeySecret,
    };

    const orderPayload = {
      amount,
      currency: "INR",
      receipt: invoice.id,
      payment_capture: 1,
      notes: {
        subscriptionId,
        userId,
        invoiceId: invoice.id,
        apiId,
      },
    };

    try {
      const response = await axios.post(`${RAZORPAY_BASE_URL}/orders`, orderPayload, {
        auth,
        headers: {
          "Content-Type": "application/json",
        },
      });

      const razorpayOrderId = response.data.id as string;

      const payment = await prisma.payment.create({
        data: {
          invoice: { connect: { id: invoice.id } },
          user: { connect: { id: userId } },
          provider: "razorpay",
          externalPaymentId: razorpayOrderId,
          status: "PENDING",
          amount: invoice.amount,
          currency: invoice.currency,
          payload: response.data as never,
        },
      });

      logger.info(`Razorpay order created: ${razorpayOrderId} for invoice ${invoice.id} (test mode: ${config.razorpayTestMode})`);

      return {
        invoice,
        payment,
        razorpayOrder: response.data,
        razorpayKeyId: config.razorpayKeyId,
        paymentUrl: response.data.short_url || null,
        testMode: config.razorpayTestMode,
      };
    } catch (error: unknown) {
      const err = error as Error & { response?: { data?: { error?: { description?: string } } } };
      logger.error("Razorpay order creation failed", err.response?.data || err.message);
      throw new AppError(
        `Payment gateway error: ${err.response?.data?.error?.description || err.message}`,
        500
      );
    }
  }
  async verifyPayment(paymentId: string) {
    if (!config.razorpayKeyId || !config.razorpayKeySecret) {
      throw new AppError("Razorpay credentials not configured", 500);
    }

    try {
      const auth = {
        username: config.razorpayKeyId,
        password: config.razorpayKeySecret,
      };

      const response = await axios.get(`${RAZORPAY_BASE_URL}/payments/${paymentId}`, {
        auth,
      });

      return response.data;
    } catch (error: unknown) {
      const err = error as Error & { response?: { data?: { error?: { description?: string } } } };
      logger.error("Razorpay payment verification failed", err.response?.data || err.message);
      throw new AppError(
        `Payment verification error: ${err.response?.data?.error?.description || err.message}`,
        500
      );
    }
  }

  async listMyInvoices(userId: string, limit = DEFAULT_INVOICE_LIMIT) {
    const invoices = await prisma.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        subscription: {
          include: {
            apiPlan: {
              include: { api: { select: { id: true, name: true, slug: true } } },
            },
          },
        },
      },
    });
    return invoices.map((inv) => ({
      id: inv.id,
      amount: inv.amount,
      currency: inv.currency,
      status: inv.status,
      type: inv.type,
      periodStart: inv.periodStart,
      periodEnd: inv.periodEnd,
      dueDate: inv.dueDate,
      paidAt: inv.paidAt,
      createdAt: inv.createdAt,
      apiName: inv.subscription?.apiPlan?.api?.name ?? (inv.apiId ? "N/A" : null),
      planName: inv.subscription?.apiPlan?.name ?? null,
    }));
  }

  async getPaymentStatus(externalPaymentId: string, userId: string) {
    const payment = await prisma.payment.findFirst({
      where: { externalPaymentId, userId },
      include: { invoice: true },
    });

    if (!payment) {
      throw new AppError("Payment not found", 404);
    }

    // For orders, we need to check the payment associated with the order
    // Razorpay returns order_id in payment response, so we check payments by order_id
    try {
      const payments = await prisma.payment.findMany({
        where: {
          userId,
          OR: [
            { externalPaymentId },
            { payload: { path: ["order_id"], equals: externalPaymentId } },
          ],
        },
        include: { invoice: true },
        orderBy: { createdAt: "desc" },
      });

      const paymentToCheck = payments[0] ?? payment;

      // Try to verify with Razorpay if we have a payment_id in the payload
      const payload = paymentToCheck.payload as RazorpayPayload | null;
      // Note: Razorpay "order" objects have an `id` that is NOT a payment id.
      // We only verify via Razorpay API when we have the actual payment id captured from checkout.
      const razorpayPaymentId = payload?.razorpayPaymentId;

      if (razorpayPaymentId && config.razorpayKeyId && config.razorpayKeySecret) {
        try {
          const razorpayData = await this.verifyPayment(razorpayPaymentId);
          if (razorpayData.status === "captured" && paymentToCheck.status !== "SUCCEEDED") {
            await prisma.payment.update({
              where: { id: paymentToCheck.id },
              data: { status: "SUCCEEDED", payload: { ...payload, razorpayPaymentId: razorpayPaymentId } as never },
            });
            await prisma.invoice.update({
              where: { id: paymentToCheck.invoiceId },
              data: { status: "PAID" },
            });
            // Update subscription status if needed
            const notes = payload?.notes || {};
            if (notes.subscriptionId) {
              await prisma.subscription.update({
                where: { id: notes.subscriptionId },
                data: { status: "ACTIVE" },
              }).catch((err) => {
                logger.warn(`Could not activate subscription ${notes.subscriptionId}: ${err.message}`);
              });
            }
          }
          return { ...paymentToCheck, razorpayStatus: razorpayData.status };
        } catch (error) {
          logger.error("Failed to verify payment with Razorpay", error);
        }
      }

      return paymentToCheck;
    } catch (error) {
      logger.error("Failed to sync payment status", error);
      return payment;
    }
  }

  async verifyRazorpayCheckoutPayment(
    userId: string,
    input: { orderId: string; paymentId: string; signature: string }
  ) {
    if (!config.razorpayKeySecret) {
      throw new AppError("Razorpay credentials not configured", 500);
    }

    const payment = await prisma.payment.findFirst({
      where: { externalPaymentId: input.orderId },
      include: {
        invoice: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!payment) {
      throw new AppError("Payment not found", 404);
    }

    if (payment.invoice?.userId && payment.invoice.userId !== userId) {
      throw new AppError("Forbidden", 403);
    }

    // Razorpay checkout signature verification:
    // expected = HMAC_SHA256(order_id + "|" + payment_id, key_secret)
    const expectedSignature = crypto
      .createHmac("sha256", config.razorpayKeySecret)
      .update(`${input.orderId}|${input.paymentId}`)
      .digest("hex");

    if (expectedSignature !== input.signature) {
      throw new AppError("Invalid payment signature", 401);
    }

    // Confirm via Razorpay API (prevents marking success for an un-captured payment)
    const razorpayPayment = await this.verifyPayment(input.paymentId);
    if (razorpayPayment?.status !== "captured") {
      throw new AppError(`Payment not captured (status: ${razorpayPayment?.status ?? "unknown"})`, 400);
    }

    // Idempotent: if already succeeded, return as-is
    if (payment.status === "SUCCEEDED") {
      return { payment, invoice: payment.invoice };
    }

    const existingPayload = (payment.payload as RazorpayPayload) || {};

    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCEEDED",
        payload: {
          ...existingPayload,
          razorpayPaymentId: input.paymentId,
          razorpayVerifiedAt: new Date().toISOString(),
          razorpayPayment,
        } as never,
      },
      include: {
        invoice: {
          include: {
            user: true,
          },
        },
      },
    });

    if (updatedPayment.invoiceId) {
      await prisma.invoice.update({
        where: { id: updatedPayment.invoiceId },
        data: { status: "PAID" },
      });
    }

    // Activate subscription if needed (manual renewals still need activation)
    const notes = existingPayload?.notes || {};
    if (notes.subscriptionId) {
      await prisma.subscription.update({
        where: { id: notes.subscriptionId },
        data: { status: "ACTIVE" },
      }).catch((err) => {
        logger.warn(`Could not activate subscription ${notes.subscriptionId}: ${err.message}`);
      });
    }

    // Send payment success email
    if (updatedPayment.invoice?.user) {
      notificationService
        .sendPaymentSuccessEmail(
          updatedPayment.invoice.user.id,
          updatedPayment.invoice.user.email,
          updatedPayment.amount,
          updatedPayment.invoice.id,
          updatedPayment.currency
        )
        .catch((err) => logger.error("Failed to send payment success email", err));

      auditLog.log({
        userId: updatedPayment.invoice.user.id,
        action: "PAYMENT_SUCCEEDED",
        entity: "Payment",
        entityId: updatedPayment.id,
        metadata: {
          amount: updatedPayment.amount,
          currency: updatedPayment.currency,
          invoiceId: updatedPayment.invoiceId,
          subscriptionId: notes.subscriptionId,
        },
      });
    }

    return { payment: updatedPayment, invoice: updatedPayment.invoice };
  }

  async simulateTestPayment(orderId: string, simulateSuccess: boolean = true) {
    // Only allow test payment simulation in test mode
    if (!config.razorpayTestMode) {
      throw new AppError("Test payment simulation only available in test mode", 400);
    }

    const payment = await prisma.payment.findFirst({
      where: { externalPaymentId: orderId },
      include: { invoice: true },
    });

    if (!payment) {
      throw new AppError("Order not found", 404);
    }

    const newStatus = simulateSuccess ? "SUCCEEDED" : "FAILED";
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: newStatus },
    });

    if (simulateSuccess && payment.invoiceId) {
      await prisma.invoice.update({
        where: { id: payment.invoiceId },
        data: { status: "PAID" },
      });

      // Also activate the subscription if this was a subscription payment
      const payload = payment.payload as RazorpayPayload | null;
      const notes = payload?.notes || {};
      if (notes.subscriptionId) {
        await prisma.subscription.update({
          where: { id: notes.subscriptionId },
          data: { status: "ACTIVE" },
        }).catch((err) => {
          logger.warn(`Could not activate subscription: ${err.message}`);
        });
      }
    }

    return { payment: updatedPayment, simulated: true };
  }

  /**
   * Retry a failed payment
   * Creates a new Razorpay order and payment record
   */
  async retryFailedPayment(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        invoice: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!payment) {
      throw new AppError("Payment not found", 404);
    }

    if (payment.status !== "FAILED") {
      throw new AppError("Payment is not in failed state", 400);
    }

    if (payment.retryCount >= payment.maxRetries) {
      throw new AppError("Maximum retry attempts reached", 400);
    }

    // Check if invoice is still pending/failed
    if (payment.invoice.status === "PAID") {
      throw new AppError("Invoice already paid", 400);
    }

    // Validate Razorpay credentials
    if (!config.razorpayKeyId || !config.razorpayKeySecret) {
      throw new AppError("Razorpay credentials not configured", 500);
    }

    const auth = {
      username: config.razorpayKeyId,
      password: config.razorpayKeySecret,
    };

    // Get original order notes to preserve subscription info
    const originalNotes = (payment.payload as RazorpayPayload)?.notes || {};
    const orderPayload = {
      amount: payment.amount,
      currency: payment.currency,
      receipt: `${payment.invoice.id}_retry_${payment.retryCount + 1}`,
      payment_capture: 1,
      notes: {
        ...originalNotes,
        originalPaymentId: payment.id,
        retryAttempt: payment.retryCount + 1,
      },
    };

    try {
      const response = await axios.post(`${RAZORPAY_BASE_URL}/orders`, orderPayload, {
        auth,
        headers: {
          "Content-Type": "application/json",
        },
      });

      const razorpayOrderId = response.data.id as string;

      // Update original payment with retry info
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          retryCount: payment.retryCount + 1,
          lastRetryAt: new Date(),
          externalPaymentId: razorpayOrderId, // Update to new order ID
          payload: response.data as never,
        },
      });

      logger.info(`Retry attempt ${payment.retryCount + 1} for payment ${payment.id}, new order: ${razorpayOrderId}`);

      // Note: Success is finalized via the Razorpay checkout verification endpoint
      // (webhooks are not used in the manual-renewal flow).

      return {
        payment,
        razorpayOrder: response.data,
        paymentUrl: response.data.short_url || null,
        retryAttempt: payment.retryCount + 1,
      };
    } catch (error: unknown) {
      const err = error as Error & { response?: { data?: { error?: { description?: string } } } };
      logger.error(`Payment retry failed for payment ${payment.id}`, err.response?.data || err.message);

      // Update retry count even on failure
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          retryCount: payment.retryCount + 1,
          lastRetryAt: new Date(),
        },
      });

      throw new AppError(
        `Payment retry error: ${err.response?.data?.error?.description || err.message}`,
        500
      );
    }
  }

  /**
   * Get failed payments eligible for retry
   */
  async getFailedPaymentsEligibleForRetry() {
    // Get all failed payments
    const allFailed = await prisma.payment.findMany({
      where: {
        status: "FAILED",
      },
      include: {
        invoice: {
          include: {
            user: true,
          },
        },
      },
    });

    // Filter to only those eligible for retry
    const eligible = allFailed.filter((payment) => {
      const maxRetries = payment.maxRetries || 3;
      const canRetry = payment.retryCount < maxRetries;

      // Only retry if last retry was more than 24 hours ago (or never retried)
      const lastRetry = payment.lastRetryAt;
      const canRetryByTime = !lastRetry || lastRetry < new Date(Date.now() - MS.DAY);

      return canRetry && canRetryByTime;
    });

    return eligible.sort((a, b) => {
      const aTime = a.lastRetryAt?.getTime() || 0;
      const bTime = b.lastRetryAt?.getTime() || 0;
      return aTime - bTime; // Oldest first
    }).slice(0, DEFAULT_BATCH_SIZE); // Process in batches
  }
}

