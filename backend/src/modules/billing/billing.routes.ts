import { Router, type NextFunction, type Request, type RequestHandler, type Response } from "express";
import { z } from "zod";
import { authenticateJWT } from "../auth/middleware/authenticate";
import { BillingService } from "./billing.service";

const router = Router();
const service = new BillingService();

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

function asyncRoute(handler: AsyncRouteHandler): RequestHandler {
  return function asyncRouteHandler(req: Request, res: Response, next: NextFunction) {
    void handler(req, res, next).catch(next);
  };
}

const createOrderSchema = z.object({
  subscriptionId: z.string().uuid(),
});

const verifyRazorpayCheckoutSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

async function createSubscriptionOrderHandler(req: Request, res: Response): Promise<void> {
  const body = createOrderSchema.parse(req.body);
  const result = await service.createSubscriptionOrder(req.user!.sub, body.subscriptionId);
  res.status(201).json({ success: true, ...result });
}

router.post(
  "/subscriptions/order",
  authenticateJWT,
  asyncRoute(async function createSubscriptionOrderRoute(req, res, next) {
    await createSubscriptionOrderHandler(req, res);
  })
);

// Pay-per-request routes removed - only monthly subscriptions are supported

async function getPaymentStatusHandler(req: Request, res: Response): Promise<void> {
  const payment = await service.getPaymentStatus(req.params.orderId, req.user!.sub);
  res.json({ success: true, payment });
}

router.get(
  "/invoices",
  authenticateJWT,
  asyncRoute(async function listMyInvoicesRoute(req, res, next) {
    const limit = req.query.limit ? Math.min(100, Number(req.query.limit)) : 50;
    const invoices = await service.listMyInvoices(req.user!.sub, limit);
    res.json({ success: true, invoices });
  })
);

router.get(
  "/payments/:orderId/status",
  authenticateJWT,
  asyncRoute(async function getPaymentStatusRoute(req, res, next) {
    await getPaymentStatusHandler(req, res);
  })
);

async function verifyRazorpayCheckoutHandler(req: Request, res: Response): Promise<void> {
  const body = verifyRazorpayCheckoutSchema.parse(req.body);
  const result = await service.verifyRazorpayCheckoutPayment(req.user!.sub, {
    orderId: body.razorpay_order_id,
    paymentId: body.razorpay_payment_id,
    signature: body.razorpay_signature,
  });
  res.json({ success: true, ...result });
}

router.post(
  "/payments/razorpay/verify",
  authenticateJWT,
  asyncRoute(async function verifyRazorpayCheckoutRoute(req, res, next) {
    await verifyRazorpayCheckoutHandler(req, res);
  })
);

router.post(
  "/test/payments/:orderId/simulate",
  authenticateJWT,
  asyncRoute(async function simulateTestPaymentRoute(req, res, next) {
    if (process.env.NODE_ENV === "production") {
      res.status(404).json({ success: false, message: "Not found" });
      return;
    }

    const simulateSuccess = req.body.success !== false;
    const result = await service.simulateTestPayment(req.params.orderId, simulateSuccess);
    res.json({ success: true, ...result });
  })
);

// Payment retry endpoints
router.post(
  "/payments/:paymentId/retry",
  authenticateJWT,
  asyncRoute(async function retryFailedPaymentRoute(req, res, next) {
    const result = await service.retryFailedPayment(req.params.paymentId);
    res.json({ success: true, ...result });
  })
);

router.get(
  "/payments/failed/eligible",
  authenticateJWT,
  asyncRoute(async function listEligibleFailedPaymentsRoute(req, res, next) {
    const payments = await service.getFailedPaymentsEligibleForRetry();
    res.json({ success: true, payments });
  })
);

export const billingRouter = router;

