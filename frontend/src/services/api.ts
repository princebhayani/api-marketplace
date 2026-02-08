const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name?: string | null;
    roles: { role: { name: string } }[] | string[];
  };
}

/** Extract role names from the auth response (handles both formats the backend may return). */
function extractRoles(roles: AuthResponse["user"]["roles"]): string[] {
  if (Array.isArray(roles) && typeof roles[0] === "string") {
    return roles as string[];
  }
  return (roles as { role: { name: string } }[]).map((r) => r.role.name);
}

function getToken() {
  return localStorage.getItem("accessToken");
}

function getRefreshToken() {
  return localStorage.getItem("refreshToken");
}

function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
}

export async function logout() {
  const refreshToken = getRefreshToken();
  const accessToken = getToken();
  // Clear tokens immediately so UI updates fast
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  // Fire-and-forget: invalidate server-side session
  if (refreshToken && accessToken) {
    fetch(`${BASE_URL}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {});
  }
}

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      logout();
      return false;
    }

    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    logout();
    return false;
  }
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers ?? {}) as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // If unauthorized and we haven't retried yet, try to refresh the token
  if (res.status === 401 && retry && path !== "/auth/refresh" && path !== "/auth/login") {
    // If already refreshing, wait for that to complete
    if (isRefreshing && refreshPromise) {
      const refreshed = await refreshPromise;
      if (refreshed) {
        return request<T>(path, options, false);
      }
    } else {
      isRefreshing = true;
      refreshPromise = tryRefreshToken();
      const refreshed = await refreshPromise;
      isRefreshing = false;
      refreshPromise = null;

      if (refreshed) {
        return request<T>(path, options, false);
      }
    }
  }

  if (!res.ok) {
    const text = await res.text();
    let errorMessage = res.statusText;

    // Try to parse JSON error response
    try {
      const errorData = JSON.parse(text);
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (typeof errorData === "string") {
        errorMessage = errorData;
      }
    } catch {
      // If not JSON, use the text as-is or statusText
      errorMessage = text || res.statusText;
    }

    const error = new Error(errorMessage);
    (error as Error & { status?: number }).status = res.status;
    throw error;
  }
  return res.json() as Promise<T>;
}

export async function login(email: string, password: string) {
  const data = await request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setTokens(data.accessToken, data.refreshToken);
  const roles = extractRoles(data.user.roles);
  return {
    id: data.user.id,
    email: data.user.email,
    name: data.user.name ?? undefined,
    roles,
  };
}

export async function register(email: string, password: string, name?: string) {
  const data = await request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
  setTokens(data.accessToken, data.refreshToken);
  const roles = extractRoles(data.user.roles);
  return {
    id: data.user.id,
    email: data.user.email,
    name: data.user.name ?? undefined,
    roles,
  };
}

export async function socialLogin(idToken: string) {
  const data = await request<AuthResponse>("/auth/social", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
  setTokens(data.accessToken, data.refreshToken);
  const roles = extractRoles(data.user.roles);
  return {
    id: data.user.id,
    email: data.user.email,
    name: data.user.name ?? undefined,
    roles,
  };
}

export async function getCurrentUser() {
  const token = getToken();
  if (!token) throw new Error("No token");
  const data = await request<{
    success: boolean;
    user: { id: string; email: string; name?: string | null; roles: string[] };
  }>("/auth/me");
  return {
    id: data.user.id,
    email: data.user.email,
    name: data.user.name ?? undefined,
    roles: data.user.roles,
  };
}

export async function selectRole(role: string) {
  const data = await request<AuthResponse>("/auth/select-role", {
    method: "POST",
    body: JSON.stringify({ role }),
  });
  setTokens(data.accessToken, data.refreshToken);
  const roles = extractRoles(data.user.roles);
  return { id: data.user.id, email: data.user.email, roles };
}

const DEFAULT_PAGE_SIZE = 12;

export interface ApisPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/** Pricing plan for an API */
export interface ApiPlan {
  id: string;
  name: string;
  description?: string | null;
  billingType: "FREE" | "SUBSCRIPTION";
  priceMonthly: number | null;
  freeTier: boolean;
  monthlyQuota: number | null;
  createdAt: string;
  apiId: string;
}

/** Public API listing item */
export interface ApiListItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  category?: string | null;
  status: string;
  baseUrl: string;
  publicRateLimitPerMinute?: number | null;
  providerDisplayName?: string | null;
  plans?: ApiPlan[];
  createdAt: string;
  updatedAt: string;
}

/** Detailed API (includes documentation, code examples, etc.) */
export interface ApiDetail extends ApiListItem {
  documentation?: string | null;
  authenticationMethod?: string | null;
  rateLimits?: string | null;
  codeExamples?: string | null;
  provider?: {
    id: string;
    displayName: string;
  } | null;
}

/** Subscription record */
export interface Subscription {
  id: string;
  userId: string;
  apiPlanId: string;
  status: "PENDING" | "ACTIVE" | "CANCELLED" | "EXPIRED";
  startedAt: string | null;
  endsAt: string | null;
  apiPlan: ApiPlan & { api: { id: string; name: string; slug: string } };
  keys?: ApiKeyRecord[];
}

/** API key record */
export interface ApiKeyRecord {
  id: string;
  key: string;
  label?: string | null;
  isActive: boolean;
  revokedAt?: string | null;
  createdAt: string;
}

/** Invoice record */
export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  type: string;
  periodStart: string | null;
  periodEnd: string | null;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
  apiName?: string | null;
  planName?: string | null;
}

/** Payment record */
export interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  externalPaymentId: string;
  createdAt: string;
}

/** Usage data point */
export interface UsageDataPoint {
  apiId: string;
  _count: { _all: number };
}

/** Detailed usage stat */
export interface DetailedUsageStat {
  subscriptionId: string;
  apiName: string;
  planName: string;
  totalRequests: number;
  monthlyQuota: number | null;
  usagePercent: number | null;
}

/** Provider revenue stats */
export interface ProviderRevenueStats {
  providerId: string;
  providerName: string;
  totalRevenue: number;
  subscriptionRevenue: number;
  commissionRate: number;
  commissionAmount: number;
  netRevenue: number;
  currency: string;
  timeSeries: {
    date: string;
    revenue: number;
    subscriptionRevenue: number;
    commissionAmount: number;
    netRevenue: number;
  }[];
  byApi: {
    apiId: string;
    apiName: string;
    revenue: number;
    subscriptionRevenue: number;
  }[];
}

/** Sale record for provider */
export interface SaleRecord {
  subscriptionId: string;
  subscribedAt: string | null;
  status: string;
  customer: { id: string; email: string; name: string | null };
  api: { id: string; name: string; slug: string };
  plan: { id: string; name: string; billingType: string; priceMonthly: number | null; freeTier: boolean };
  payment: { amount: number; currency: string; paidAt: string } | null;
}

/** Purchase history record */
export interface PurchaseRecord {
  subscriptionId: string;
  apiName: string;
  planName: string;
  status: string;
  amount: number | null;
  currency: string;
  subscribedAt: string | null;
}

/** Admin overview stats */
export interface AdminOverview {
  success: boolean;
  apiCount: number;
  userCount: number;
  invoiceStats: { status: string; _sum: { amount: number | null } }[];
  dailyUsage: unknown[];
}

/** Admin finance data */
export interface AdminFinanceData {
  totalRevenue: number;
  monthlyRevenue: number;
  invoiceStatuses: { status: string; count: number; total: number }[];
  recentInvoices: {
    id: string;
    amount: number;
    status: string;
    createdAt: string;
    userName: string | null;
    apiName: string;
  }[];
}

/** User profile */
export interface UserProfile {
  id: string;
  email: string;
  name?: string | null;
}

/** Change password input */
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export async function fetchApis(params?: { search?: string; page?: number; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set("search", params.search);
  if (params?.page != null) searchParams.set("page", String(params.page));
  if (params?.limit != null) searchParams.set("limit", String(params.limit));
  const qs = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const data = await request<{
    success: boolean;
    apis: ApiListItem[];
    total: number;
    pagination: ApisPagination;
  }>(`/apis${qs}`);
  return {
    apis: data.apis,
    total: data.total,
    pagination: data.pagination,
  };
}

export const API_PAGE_SIZE = DEFAULT_PAGE_SIZE;

export async function fetchApiById(id: string) {
  const data = await request<{ success: boolean; api: ApiDetail }>(`/apis/${id}`);
  return data.api;
}

export async function subscribeToPlan(apiPlanId: string) {
  const data = await request<{ success: boolean; subscription: Subscription }>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({ apiPlanId }),
  });
  return data.subscription;
}

export async function listMySubscriptions() {
  const data = await request<{ success: boolean; subscriptions: Subscription[] }>("/subscriptions/me");
  return data.subscriptions;
}

export async function createApiKey(subscriptionId: string, label?: string) {
  const data = await request<{ success: boolean; key: ApiKeyRecord }>(`/subscriptions/${subscriptionId}/keys`, {
    method: "POST",
    body: JSON.stringify({ label }),
  });
  return data.key;
}

export async function listKeys(subscriptionId: string) {
  const data = await request<{ success: boolean; keys: ApiKeyRecord[] }>(`/subscriptions/${subscriptionId}/keys`);
  return data.keys;
}

export async function fetchConsumerUsage() {
  const data = await request<{ success: boolean; data: UsageDataPoint[] }>("/analytics/consumer/usage");
  return data.data;
}

// Get detailed usage statistics per subscription
export async function getDetailedUsageStats() {
  const data = await request<{ success: boolean; data: DetailedUsageStat[] }>("/subscriptions/me/usage/detailed");
  return data.data;
}

export async function deleteSubscription(subscriptionId: string) {
  const data = await request<{ success: boolean; deleted: boolean; subscriptionId: string }>(
    `/subscriptions/${subscriptionId}`,
    {
      method: "DELETE",
    }
  );
  return data;
}

export async function bulkDeleteSubscriptions(subscriptionIds: string[]) {
  const data = await request<{ success: boolean; deleted: boolean; count: number }>(
    "/subscriptions/bulk-delete",
    {
      method: "POST",
      body: JSON.stringify({ subscriptionIds }),
    }
  );
  return data;
}

// Pay-per-request functions removed - only monthly subscriptions are supported

// Subscription order and payment
export async function createSubscriptionOrder(subscriptionId: string) {
  const data = await request<{
    success: boolean;
    invoice: Invoice;
    payment: PaymentRecord;
    razorpayOrder: { id: string; amount: number; currency: string; [key: string]: unknown };
    razorpayKeyId?: string;
    paymentUrl: string | null;
    testMode?: boolean;
  }>(
    "/billing/subscriptions/order",
    {
      method: "POST",
      body: JSON.stringify({ subscriptionId }),
    }
  );
  return data;
}

export async function listMyInvoices(limit?: number) {
  const q = limit != null ? `?limit=${limit}` : "";
  const data = await request<{ success: boolean; invoices: Invoice[] }>(
    `/billing/invoices${q}`
  );
  return data.invoices;
}

export async function getPaymentStatus(orderId: string) {
  const data = await request<{ success: boolean; payment: PaymentRecord }>(
    `/billing/payments/${orderId}/status`
  );
  return data.payment;
}

export async function verifyRazorpayCheckoutPayment(input: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  const data = await request<{ success: boolean; payment: PaymentRecord; invoice: Invoice }>(
    "/billing/payments/razorpay/verify",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
  return data;
}

// Simulate test payment (only works in dev/test mode)
export async function simulateTestPayment(orderId: string, success: boolean = true) {
  const data = await request<{ success: boolean; payment: PaymentRecord; simulated: boolean }>(
    `/billing/test/payments/${orderId}/simulate`,
    {
      method: "POST",
      body: JSON.stringify({ success }),
    }
  );
  return data;
}

// API Key management
export async function regenerateApiKey(subscriptionId: string, keyId: string) {
  const data = await request<{ success: boolean; key: ApiKeyRecord }>(
    `/subscriptions/${subscriptionId}/keys/${keyId}/regenerate`,
    {
      method: "POST",
    }
  );
  return data.key;
}

export async function revokeApiKey(subscriptionId: string, keyId: string) {
  const data = await request<{ success: boolean; key: ApiKeyRecord }>(
    `/subscriptions/${subscriptionId}/keys/${keyId}/revoke`,
    {
      method: "POST",
    }
  );
  return data.key;
}

export async function deleteApiKey(subscriptionId: string, keyId: string) {
  const data = await request<{ success: boolean; deleted: boolean; keyId: string }>(
    `/subscriptions/${subscriptionId}/keys/${keyId}`,
    {
      method: "DELETE",
    }
  );
  return data;
}

// Provider APIs
export async function getMyApis() {
  const data = await request<{ success: boolean; apis: ApiListItem[] }>("/provider/apis");
  return data.apis;
}

export async function createApi(apiData: {
  name: string;
  slug: string;
  baseUrl: string;
  category?: string;
  description?: string;
  providerDisplayName?: string;
  authenticationMethod?: string;
  rateLimits?: string;
  publicRateLimitPerMinute?: number;
}) {
  const data = await request<{ success: boolean; api: ApiDetail }>("/provider/apis", {
    method: "POST",
    body: JSON.stringify(apiData),
  });
  return data.api;
}

export async function updateApi(apiId: string, apiData: {
  name?: string;
  baseUrl?: string;
  category?: string;
  description?: string;
  authenticationMethod?: string;
  rateLimits?: string;
  publicRateLimitPerMinute?: number;
  documentation?: string;
}) {
  const data = await request<{ success: boolean; api: ApiDetail }>(`/provider/apis/${apiId}`, {
    method: "PUT",
    body: JSON.stringify(apiData),
  });
  return data.api;
}

export async function addApiVersion(apiId: string, version: string, specUrl?: string, specJson?: unknown) {
  const data = await request<{ success: boolean; version: Record<string, unknown> }>(`/provider/apis/${apiId}/versions`, {
    method: "POST",
    body: JSON.stringify({ version, specUrl, specJson }),
  });
  return data.version;
}

export async function addApiPlan(apiId: string, planData: {
  name: string;
  description?: string;
  billingType: "SUBSCRIPTION" | "FREE";
  priceMonthly?: number | null;
  freeTier?: boolean;
  monthlyQuota?: number | null;
}) {
  const data = await request<{ success: boolean; plan: ApiPlan }>(`/provider/apis/${apiId}/plans`, {
    method: "POST",
    body: JSON.stringify(planData),
  });
  return data.plan;
}

export async function deleteApiPlan(planId: string) {
  const data = await request<{ success: boolean; message?: string }>(`/provider/apis/plans/${planId}`, {
    method: "DELETE",
  });
  return data;
}

export async function submitApiForReview(apiId: string) {
  const data = await request<{ success: boolean; api: ApiDetail }>(
    `/provider/apis/${apiId}/submit-for-review`,
    {
      method: "POST",
    }
  );
  return data.api;
}

export async function fetchProviderApiById(id: string) {
  const data = await request<{ success: boolean; api: ApiDetail }>(`/provider/apis/${id}`);
  return data.api;
}

export async function fetchProviderApiOverview(id: string) {
  const data = await request<{ success: boolean; api: ApiDetail }>(`/provider/apis/${id}/overview`);
  return data.api;
}

export async function fetchProviderApiPlans(id: string) {
  const data = await request<{ success: boolean; api: ApiDetail }>(`/provider/apis/${id}/plans`);
  return data.api;
}

export async function fetchProviderApiDocs(id: string) {
  const data = await request<{ success: boolean; api: ApiDetail }>(`/provider/apis/${id}/docs`);
  return data.api;
}

// Admin APIs
export async function getAdminApis(status?: string) {
  const qs = status ? `?status=${status}` : "";
  const data = await request<{ success: boolean; apis: ApiListItem[] }>(`/admin/apis${qs}`);
  return data.apis;
}

export async function getAdminApiById(apiId: string) {
  const data = await request<{ success: boolean; api: ApiDetail }>(`/admin/apis/${apiId}`);
  return data.api;
}

export async function approveApi(apiId: string) {
  const data = await request<{ success: boolean; api: ApiDetail }>(`/admin/apis/${apiId}/approve`, {
    method: "POST",
  });
  return data.api;
}

export async function publishApi(apiId: string) {
  const data = await request<{ success: boolean; api: ApiDetail }>(`/admin/apis/${apiId}/publish`, {
    method: "POST",
  });
  return data.api;
}

export async function suspendApi(apiId: string) {
  const data = await request<{ success: boolean; api: ApiDetail }>(`/admin/apis/${apiId}/suspend`, {
    method: "POST",
  });
  return data.api;
}

export async function activateApi(apiId: string) {
  const data = await request<{ success: boolean; api: ApiDetail }>(`/admin/apis/${apiId}/activate`, {
    method: "POST",
  });
  return data.api;
}

export async function rejectApi(apiId: string) {
  const data = await request<{ success: boolean; api: ApiDetail }>(`/admin/apis/${apiId}/reject`, {
    method: "POST",
  });
  return data.api;
}

export async function changeApiStatus(
  apiId: string,
  status: "DRAFT" | "REVIEW" | "APPROVED" | "LIVE" | "SUSPENDED"
) {
  const data = await request<{ success: boolean; api: ApiDetail }>(
    `/admin/apis/${apiId}/status`,
    {
      method: "POST",
      body: JSON.stringify({ status }),
    }
  );
  return data.api;
}

// Analytics
export async function getProviderRevenue(params?: {
  providerId?: string;
  startDate?: string;
  endDate?: string;
  groupBy?: "day" | "month";
}) {
  const qs = new URLSearchParams();
  if (params?.providerId) qs.append("providerId", params.providerId);
  if (params?.startDate) qs.append("startDate", params.startDate);
  if (params?.endDate) qs.append("endDate", params.endDate);
  if (params?.groupBy) qs.append("groupBy", params.groupBy);

  const data = await request<{ success: boolean; data: ProviderRevenueStats }>(
    `/analytics/provider/revenue${qs.toString() ? `?${qs.toString()}` : ""}`
  );
  return data.data;
}

export async function getProviderUsage() {
  const data = await request<{ success: boolean; data: UsageDataPoint[] }>("/analytics/provider/usage");
  return data.data;
}

// Get provider's sales history (who bought their APIs)
export async function getProviderSales(params?: {
  providerId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.providerId) qs.append("providerId", params.providerId);
  if (params?.startDate) qs.append("startDate", params.startDate);
  if (params?.endDate) qs.append("endDate", params.endDate);

  const data = await request<{ success: boolean; data: SaleRecord[] }>(
    `/analytics/provider/sales${qs.toString() ? `?${qs.toString()}` : ""}`
  );
  return data.data;
}

// Get user's purchase history
export async function getPurchaseHistory() {
  const data = await request<{ success: boolean; data: PurchaseRecord[] }>("/subscriptions/me/purchases");
  return data.data;
}

export async function getAdminOverview() {
  const data = await request<AdminOverview>(
    "/analytics/admin/overview"
  );
  return data;
}

// Refunds
export async function requestRefund(paymentId: string, amount?: number, reason?: string) {
  const data = await request<{ success: boolean; refund: Record<string, unknown> }>(`/billing/payments/${paymentId}/refund`, {
    method: "POST",
    body: JSON.stringify({ amount, reason }),
  });
  return data.refund;
}

export async function getRefundStatus(refundId: string) {
  const data = await request<{ success: boolean; refund: Record<string, unknown> }>(`/billing/refunds/${refundId}`);
  return data.refund;
}

export async function listRefundsForPayment(paymentId: string) {
  const data = await request<{ success: boolean; refunds: Record<string, unknown>[] }>(`/billing/payments/${paymentId}/refunds`);
  return data.refunds;
}

export async function updateProfile(data: { name?: string }) {
  const res = await request<{ success: boolean; user: UserProfile }>("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.user;
}

export async function changePassword(data: ChangePasswordInput) {
  await request<{ success: boolean }>("/auth/change-password", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function getAdminFinance() {
  const data = await request<{ success: boolean; data: AdminFinanceData }>("/analytics/admin/finance");
  return data.data;
}

// Audit logs (activity)
export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export async function getAuditLogs(params?: { limit?: number; cursor?: string }) {
  const qs = new URLSearchParams();
  if (params?.limit != null) qs.set("limit", String(params.limit));
  if (params?.cursor) qs.set("cursor", params.cursor);
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const data = await request<{
    success: boolean;
    logs: AuditLogEntry[];
    nextCursor: string | null;
    hasMore: boolean;
  }>(`/audit-logs${query}`);
  return { logs: data.logs, nextCursor: data.nextCursor, hasMore: data.hasMore };
}
