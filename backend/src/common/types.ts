/**
 * Shared TypeScript interfaces for the API Marketplace backend.
 * Replaces `any` type usage across modules with proper type definitions.
 */

/** Razorpay payment payload stored in Payment.payload JSON field */
export interface RazorpayPayload {
  id?: string;
  entity?: string;
  amount?: number;
  currency?: string;
  status?: string;
  order_id?: string;
  short_url?: string | null;
  razorpayPaymentId?: string;
  razorpayVerifiedAt?: string;
  razorpayPayment?: Record<string, unknown>;
  notes?: PaymentNotes;
}

/** Notes embedded in Razorpay order/payment payload */
export interface PaymentNotes {
  subscriptionId?: string;
  userId?: string;
  invoiceId?: string;
  apiId?: string;
  originalPaymentId?: string;
  retryAttempt?: number;
}

/** Time duration constants (in milliseconds) */
export const MS = {
  SECOND: 1_000,
  MINUTE: 60_000,
  HOUR: 3_600_000,
  DAY: 86_400_000,
  WEEK: 604_800_000,
  MONTH_30: 2_592_000_000,  // 30 days
  MONTH_90: 7_776_000_000,  // 90 days
} as const;

/** Session expiry duration: 30 days */
export const SESSION_EXPIRY_MS = MS.MONTH_30;

/** Invoice period: 30 days */
export const INVOICE_PERIOD_MS = MS.MONTH_30;

/** Invoice due date: 7 days */
export const INVOICE_DUE_MS = MS.WEEK;

/** Default batch size for processing */
export const DEFAULT_BATCH_SIZE = 100;

/** Default invoice listing limit */
export const DEFAULT_INVOICE_LIMIT = 50;

/** Max invoice listing limit */
export const MAX_INVOICE_LIMIT = 100;
