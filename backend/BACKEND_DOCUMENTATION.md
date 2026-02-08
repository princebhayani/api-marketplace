# API Marketplace Backend -- Complete Documentation

Production-grade Node.js/Express REST API powering the API Marketplace platform. Handles authentication, API lifecycle management, subscription billing, request proxying, and analytics.

---

## 1. Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 18+ | Runtime environment |
| Express | 4.19.2 | HTTP server and routing |
| TypeScript | 5.6.3 | Type safety (strict mode, ES2020 target, CommonJS) |
| PostgreSQL | 14+ | Primary relational database |
| Prisma | 5.20.0 | ORM, schema management, migrations |
| Redis | 7+ | Rate limiting (sorted sets), job queue broker |
| BullMQ | 5.12.7 | Background job processing |
| jsonwebtoken | 9.0.2 | JWT token signing and verification |
| bcrypt | 5.1.1 | Password hashing (10 salt rounds) |
| Firebase Admin | 13.6.0 | OAuth token verification (Google) |
| Razorpay | via Axios | Payment order creation and verification |
| Zod | 3.23.8 | Request body/query validation |
| Helmet | 7.0.0 | HTTP security headers |
| CORS | 2.8.5 | Cross-origin request handling |
| Axios | 1.7.7 | HTTP client for gateway proxying and Razorpay API |
| Nodemailer | 6.9.8 | Email transport (currently disabled) |
| pg | - | PostgreSQL connection pool (health check) |

---

## 2. Directory Structure

```
backend/
├── src/
│   ├── server.ts                          # App bootstrap, middleware chain, job scheduling
│   ├── routes.ts                          # Route registration hub (mounts all routers)
│   ├── config/
│   │   ├── env.ts                         # Environment variable loading and validation
│   │   ├── db.ts                          # PostgreSQL connection pool (health check)
│   │   ├── prisma.ts                      # Prisma ORM singleton client
│   │   ├── redis.ts                       # Redis client initialization
│   │   └── firebase.ts                    # Firebase Admin SDK setup
│   ├── common/
│   │   ├── logger.ts                      # Console logger (info, error, warn)
│   │   ├── types.ts                       # Shared TypeScript interfaces and constants
│   │   └── middleware/
│   │       ├── errorHandler.ts            # Global error handler (Zod, Prisma, AppError)
│   │       └── requestLogger.ts           # HTTP request logging (method + URL)
│   ├── modules/
│   │   ├── auth/                          # Authentication and sessions
│   │   │   ├── auth.routes.ts             # 9 auth endpoints
│   │   │   ├── auth.service.ts            # Auth business logic
│   │   │   └── middleware/
│   │   │       └── authenticate.ts        # JWT verification middleware
│   │   ├── apis/                          # API catalog and lifecycle
│   │   │   ├── apis.routes.ts             # Provider, admin, and public routes
│   │   │   └── apis.service.ts            # API CRUD, plans, status changes
│   │   ├── subscriptions/                 # Subscription and API key management
│   │   │   ├── subscriptions.routes.ts    # 12 subscription endpoints
│   │   │   └── subscriptions.service.ts   # Subscribe, keys, usage, history
│   │   ├── billing/                       # Payment processing
│   │   │   ├── billing.routes.ts          # 7 billing endpoints
│   │   │   └── billing.service.ts         # Razorpay orders, verification, retry
│   │   ├── gateway/                       # API request proxying
│   │   │   ├── gateway.routes.ts          # ALL /gateway/:apiSlug routes
│   │   │   └── gateway.service.ts         # Key validation, rate limiting, forwarding
│   │   ├── analytics/                     # Usage and revenue metrics
│   │   │   ├── analytics.routes.ts        # 6 analytics endpoints
│   │   │   └── analytics.service.ts       # Revenue, sales, admin finance
│   │   ├── audit/                         # Compliance logging
│   │   │   ├── audit.routes.ts            # GET /audit-logs (cursor pagination)
│   │   │   └── audit.service.ts           # Fire-and-forget log writer
│   │   ├── notifications/                 # Email system (disabled)
│   │   │   ├── notifications.routes.ts    # POST /notifications/test-email (410)
│   │   │   └── notification.service.ts    # No-op stub (all methods log and return)
│   │   └── rbac/                          # Role-based access control
│   │       ├── middleware/
│   │       │   └── rbac.ts                # requireRole and requirePermission middleware
│   │       └── repositories/
│   │           └── role.repository.ts     # Role lookup and assignment
│   └── jobs/                              # BullMQ background workers
│       ├── email.queue.ts                 # Email notification queue definition
│       ├── email.worker.ts                # Email job processor
│       ├── subscriptionExpiry.worker.ts   # Subscription expiry checker
│       └── usageAggregation.worker.ts     # Payment retry worker (misnamed)
├── prisma/
│   ├── schema.prisma                      # 13 database models, 6 enums
│   ├── seed.ts                            # Seeds SuperAdmin + User roles
│   └── migrations/                        # 8 migration files
├── .env.example                           # Environment variable template
├── Dockerfile                             # Multi-stage Docker build
├── package.json                           # Dependencies and scripts
└── tsconfig.json                          # TypeScript compiler config
```

---

## 3. API Endpoints

### 3.1 Authentication (`/auth`) -- 9 routes

| Method | Path | Auth | Request Body | Description |
|--------|------|------|-------------|-------------|
| POST | `/auth/register` | None | `{ email: string, password: string (min 8), name?: string }` | Create account. Returns user + tokens |
| POST | `/auth/login` | None | `{ email: string, password: string, deviceInfo?: string }` | Login with credentials. Returns user + tokens |
| POST | `/auth/social` | None | `{ idToken: string }` | Firebase OAuth login. Returns user + tokens |
| POST | `/auth/refresh` | None | `{ refreshToken: string }` | Rotate access/refresh tokens |
| POST | `/auth/logout` | None | `{ refreshToken: string }` | Revoke refresh token session |
| GET | `/auth/me` | JWT | - | Get current user profile with roles |
| POST | `/auth/select-role` | JWT | `{ role: "User" }` | Assign User role to current user |
| PATCH | `/auth/profile` | JWT | `{ name?: string }` | Update display name |
| PATCH | `/auth/change-password` | JWT | `{ currentPassword: string, newPassword: string (min 8) }` | Change password |

**Response format** (all auth endpoints):
```json
{
  "success": true,
  "user": { "id": "uuid", "email": "...", "name": "...", "roles": ["User"] },
  "accessToken": "jwt...",
  "refreshToken": "token..."
}
```

### 3.2 Public APIs -- 2 routes

| Method | Path | Auth | Query Params | Description |
|--------|------|------|-------------|-------------|
| GET | `/apis` | None | `page`, `limit` (1-100), `search`, `category` | List LIVE APIs with pagination |
| GET | `/apis/:id` | None | - | Get single LIVE API with plans and provider |

**Pagination response**:
```json
{
  "success": true,
  "apis": [...],
  "total": 42,
  "pagination": { "page": 1, "limit": 12, "total": 42, "totalPages": 4, "hasNextPage": true, "hasPrevPage": false }
}
```

### 3.3 Provider APIs (`/provider/apis`) -- 10 routes

All routes require JWT + `User` role.

| Method | Path | Request | Description |
|--------|------|---------|-------------|
| GET | `/provider/apis` | - | List provider's own APIs |
| POST | `/provider/apis` | `{ name (3-100), slug (3-80), baseUrl (URL), category?, description? (max 150), providerDisplayName?, documentation?, authenticationMethod?, rateLimits?, publicRateLimitPerMinute? }` | Create new API |
| PUT | `/provider/apis/:id` | Same fields as create (all optional) | Update API |
| GET | `/provider/apis/:id` | - | Get API by ID |
| GET | `/provider/apis/:id/overview` | - | Get API with stats |
| GET | `/provider/apis/:id/plans` | - | List pricing plans |
| GET | `/provider/apis/:id/docs` | - | Get documentation field |
| POST | `/provider/apis/:id/plans` | `{ name (max 60), description? (max 150), billingType ("SUBSCRIPTION"\|"FREE"), priceMonthly?, freeTier?, monthlyQuota? }` | Add pricing plan |
| DELETE | `/provider/apis/plans/:planId` | - | Delete plan (fails if plan has active subscriptions) |
| POST | `/provider/apis/:id/submit-for-review` | - | Change status to REVIEW |

### 3.4 Admin APIs (`/admin/apis`) -- 9 routes

All routes require JWT + `SuperAdmin` role.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/apis` | List all APIs (query: `status` filter) |
| GET | `/admin/apis/:id` | Get API with provider, plans, subscriber count |
| PATCH | `/admin/apis/:id/status` | Change status (body: `{ status: "DRAFT"\|"REVIEW"\|"APPROVED"\|"LIVE"\|"SUSPENDED" }`) |
| POST | `/admin/apis/:id/status` | Same as PATCH (alternate method) |
| POST | `/admin/apis/:id/approve` | Set status to APPROVED |
| POST | `/admin/apis/:id/publish` | Set status to LIVE |
| POST | `/admin/apis/:id/suspend` | Set status to SUSPENDED |
| POST | `/admin/apis/:id/activate` | Set status to LIVE (reactivate) |
| POST | `/admin/apis/:id/reject` | Set status to DRAFT |

### 3.5 Subscriptions (`/subscriptions`) -- 12 routes

All routes require JWT.

| Method | Path | Request | Description |
|--------|------|---------|-------------|
| POST | `/subscriptions` | `{ apiPlanId: uuid }` | Subscribe to plan. Free plans activate immediately; paid plans are PENDING |
| GET | `/subscriptions/me` | - | List user's subscriptions with plan and API details |
| GET | `/subscriptions/me/usage` | - | Usage stats grouped by apiId (last 30 days) |
| GET | `/subscriptions/me/purchases` | - | Purchase history with payment amounts |
| GET | `/subscriptions/me/usage/detailed` | - | Detailed per-subscription usage with quota percentages |
| DELETE | `/subscriptions/:id` | - | Delete subscription (deletes keys first) |
| POST | `/subscriptions/bulk-delete` | `{ subscriptionIds: uuid[] }` | Delete multiple subscriptions |
| POST | `/subscriptions/:id/keys` | `{ label?: string }` | Create API key (format: `key_<uuid>`) |
| GET | `/subscriptions/:id/keys` | - | List API keys for subscription |
| POST | `/subscriptions/:id/keys/:keyId/regenerate` | - | Generate new key value |
| POST | `/subscriptions/:id/keys/:keyId/revoke` | - | Revoke key (set revokedAt, isActive=false) |
| DELETE | `/subscriptions/:id/keys/:keyId` | - | Permanently delete key |

### 3.6 Billing (`/billing`) -- 7 routes

All routes require JWT.

| Method | Path | Request | Description |
|--------|------|---------|-------------|
| POST | `/billing/subscriptions/order` | `{ subscriptionId: uuid }` | Create Razorpay order. Returns invoice, payment, razorpayOrder, keyId |
| GET | `/billing/invoices` | `?limit=50` (max 100) | List user's invoices |
| GET | `/billing/payments/:orderId/status` | - | Get payment by external order ID |
| POST | `/billing/payments/razorpay/verify` | `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` | Verify payment with HMAC-SHA256. Updates Payment, Invoice, Subscription |
| POST | `/billing/test/payments/:orderId/simulate` | `{ success?: boolean }` | Simulate payment (non-production only, returns 404 in production) |
| POST | `/billing/payments/:paymentId/retry` | - | Retry failed payment (creates new Razorpay order) |
| GET | `/billing/payments/failed/eligible` | - | List payments eligible for retry (retryCount < maxRetries, last retry > 24h ago) |

### 3.7 Gateway -- 2 routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| ALL | `/gateway/:apiSlug` | X-API-Key header | Forward request to API (no subpath) |
| ALL | `/gateway/:apiSlug/*` | X-API-Key header | Forward request to API (with subpath) |

**Request headers**: `X-API-Key: key_<uuid>`

**Error responses**:
- 401: Missing or invalid API key, inactive subscription, API not LIVE
- 429: Rate limit exceeded (per-minute) or monthly quota exceeded
- 502: Upstream API error

### 3.8 Analytics -- 6 routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/analytics/provider/usage` | JWT + User | Usage logs grouped by apiId (last 30 days) |
| GET | `/analytics/consumer/usage` | JWT + User | Consumer's usage grouped by apiId (last 30 days) |
| GET | `/analytics/admin/overview` | JWT + SuperAdmin | API count, user count, invoice stats by status |
| GET | `/analytics/provider/revenue` | JWT + User | Revenue with commission. Query: `providerId?`, `startDate?`, `endDate?`, `groupBy? (day\|month)` |
| GET | `/analytics/provider/sales` | JWT + User | Sales history (subscriptions with payments). Query: `providerId?`, `startDate?`, `endDate?` |
| GET | `/analytics/admin/finance` | JWT + SuperAdmin | Total paid, monthly breakdown, invoice status counts, recent invoices |

### 3.9 System -- 3 routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | None | Root message: `{ message: "API Marketplace backend" }` |
| GET | `/health` | None | Health check: `{ status: "ok" }` |
| GET | `/audit-logs` | JWT | User's audit logs with cursor pagination. Query: `limit? (1-100)`, `cursor? (uuid)` |

### 3.10 Notifications -- 1 route (disabled)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/notifications/test-email` | JWT + SuperAdmin | Returns 410 "Email notifications have been disabled" |

---

## 4. Database Models

### 4.1 User

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | @id @default(uuid()) | Primary key |
| email | String | @unique | Login email |
| passwordHash | String | required | bcrypt hash |
| name | String? | optional | Display name |
| razorpayCustomerId | String? | @unique | Razorpay customer reference |
| isActive | Boolean | @default(true) | Account status |
| emailVerifiedAt | DateTime? | optional | Email verification timestamp |
| lastLoginAt | DateTime? | optional | Last login timestamp |
| failedLoginAttempts | Int | @default(0) | Login attempt counter |
| createdAt | DateTime | @default(now()) | Creation timestamp |
| updatedAt | DateTime | @updatedAt | Last update |

**Relations**: roles (UserRole[]), apiProvider (ApiProvider?), subscriptions[], apiKeys[], invoices[], payments[], sessions (UserSession[]), auditLogs[]

### 4.2 Role

| Field | Type | Constraints |
|-------|------|-------------|
| id | Int | @id @default(autoincrement()) |
| name | String | @unique |
| description | String? | optional |

**Seeded values**: SuperAdmin, User

### 4.3 UserRole (Junction Table)

| Field | Type | Constraints |
|-------|------|-------------|
| userId | String | FK -> User |
| roleId | Int | FK -> Role |

**Composite PK**: @@id([userId, roleId]). Cascade delete on both sides.

### 4.4 ApiProvider

| Field | Type | Constraints |
|-------|------|-------------|
| id | String | @id @default(uuid()) |
| userId | String | @unique, FK -> User |
| displayName | String | required |
| website | String? | optional |
| createdAt | DateTime | @default(now()) |

**Relations**: user (1:1 with User), apis (Api[])

### 4.5 Api

| Field | Type | Constraints |
|-------|------|-------------|
| id | String | @id @default(uuid()) |
| providerId | String | FK -> ApiProvider |
| name | String | required |
| slug | String | @unique |
| category | String? | optional |
| baseUrl | String | required (target API URL) |
| description | String? | optional |
| status | ApiStatus | @default(DRAFT) |
| authenticationMethod | String? | e.g. "API Key" |
| rateLimits | String? | Descriptive text |
| publicRateLimitPerMinute | Int? | Requests per minute limit |
| documentation | String? | Markdown content |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |

**Relations**: provider (ApiProvider), plans (ApiPlan[])

### 4.6 ApiPlan

| Field | Type | Constraints |
|-------|------|-------------|
| id | String | @id @default(uuid()) |
| apiId | String | FK -> Api |
| name | String | required |
| description | String? | optional |
| billingType | BillingType | SUBSCRIPTION or FREE |
| priceMonthly | Int? | Amount in paise (smallest currency unit) |
| freeTier | Boolean | @default(false) |
| monthlyQuota | Int? | null = unlimited |
| createdAt | DateTime | @default(now()) |

**Relations**: api (Api), subscriptions (Subscription[])

### 4.7 Subscription

| Field | Type | Constraints |
|-------|------|-------------|
| id | String | @id @default(uuid()) |
| userId | String | FK -> User |
| apiPlanId | String | FK -> ApiPlan |
| status | SubscriptionStatus | @default(ACTIVE) |
| startedAt | DateTime | @default(now()) |
| endsAt | DateTime? | optional (subscription end date) |
| cancelledAt | DateTime? | optional |
| softLimit | Int? | optional usage warning threshold |
| razorpaySubscriptionId | String? | @unique |

**Relations**: user, apiPlan, apiKeys[], invoices[]

### 4.8 ApiKey

| Field | Type | Constraints |
|-------|------|-------------|
| id | String | @id @default(uuid()) |
| subscriptionId | String | FK -> Subscription |
| userId | String | FK -> User |
| key | String | @unique (format: `key_<uuid>`) |
| label | String? | optional description |
| isActive | Boolean | @default(true) |
| createdAt | DateTime | @default(now()) |
| revokedAt | DateTime? | set when revoked |

### 4.9 UsageLog

| Field | Type | Constraints |
|-------|------|-------------|
| id | String | @id @default(uuid()) |
| apiId | String | required |
| apiKeyId | String? | optional |
| subscriptionId | String? | optional |
| userId | String? | optional |
| path | String | request path |
| method | String | HTTP method |
| statusCode | Int | response status |
| latencyMs | Int | round-trip time |
| timestamp | DateTime | @default(now()) |
| bytesIn | Int | @default(0) |
| bytesOut | Int | @default(0) |

**Indexes**: [apiId, timestamp], [subscriptionId, timestamp], [userId, timestamp]

### 4.10 Invoice

| Field | Type | Constraints |
|-------|------|-------------|
| id | String | @id @default(uuid()) |
| userId | String | FK -> User |
| subscriptionId | String? | FK -> Subscription (SetNull on delete) |
| apiId | String? | Retained for provider earnings after subscription deletion |
| periodStart | DateTime | billing period start |
| periodEnd | DateTime | billing period end |
| amount | Int | in paise (smallest currency unit) |
| currency | String | @default("INR") |
| status | InvoiceStatus | @default(PENDING) |
| dueDate | DateTime | payment due date |
| type | InvoiceType | @default(SUBSCRIPTION) |
| externalInvoiceId | String? | external reference |
| externalAddonId | String? | external reference |
| paidAt | DateTime? | payment confirmation time |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |

**Indexes**: [subscriptionId, status, createdAt], [apiId, status], [type, status, createdAt]

### 4.11 Payment

| Field | Type | Constraints |
|-------|------|-------------|
| id | String | @id @default(uuid()) |
| invoiceId | String | FK -> Invoice |
| userId | String | FK -> User |
| provider | String | e.g. "razorpay" |
| externalPaymentId | String | Razorpay order/payment ID |
| status | PaymentStatus | @default(PENDING) |
| amount | Int | in paise |
| currency | String | @default("INR") |
| payload | Json | Full Razorpay response |
| retryCount | Int | @default(0) |
| lastRetryAt | DateTime? | last retry attempt |
| maxRetries | Int | @default(3) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |

**Indexes**: [status, retryCount], [invoiceId, status]

### 4.12 AuditLog

| Field | Type | Constraints |
|-------|------|-------------|
| id | String | @id @default(uuid()) |
| userId | String? | FK -> User (optional) |
| action | String | e.g. "user.login", "key.create" |
| entity | String? | e.g. "subscription", "api" |
| entityId | String? | ID of affected entity |
| metadata | Json? | Additional context |
| createdAt | DateTime | @default(now()) |

**Index**: [userId, createdAt]

### 4.13 UserSession

| Field | Type | Constraints |
|-------|------|-------------|
| id | String | @id @default(uuid()) |
| userId | String | FK -> User |
| deviceInfo | String? | user agent or device description |
| ipAddress | String? | client IP |
| refreshToken | String | @unique |
| expiresAt | DateTime | session expiry (30 days) |
| revokedAt | DateTime? | set on logout |
| createdAt | DateTime | @default(now()) |

**Index**: [userId, createdAt]

### 4.14 Enums

| Enum | Values |
|------|--------|
| **ApiStatus** | DRAFT, REVIEW, APPROVED, LIVE, SUSPENDED |
| **BillingType** | SUBSCRIPTION, FREE |
| **SubscriptionStatus** | PENDING, ACTIVE, CANCELLED, EXPIRED |
| **InvoiceStatus** | PENDING, PAID, FAILED, CANCELLED |
| **InvoiceType** | SUBSCRIPTION |
| **PaymentStatus** | PENDING, SUCCEEDED, FAILED, REFUNDED |

---

## 5. Authentication System

### 5.1 JWT Strategy

| Token | Lifetime | Secret | Payload |
|-------|----------|--------|---------|
| Access | 15 minutes | `JWT_ACCESS_SECRET` | `{ sub: userId, email, roles: string[] }` |
| Refresh | 30 days | `JWT_REFRESH_SECRET` | `{ sub: userId, email, roles: string[] }` |

### 5.2 Token Flow

```
Register/Login
    -> Issue accessToken (15m) + refreshToken (30d)
    -> Store refreshToken in UserSession table
    -> Return both tokens to client

API Request
    -> Client sends: Authorization: Bearer <accessToken>
    -> authenticateJWT middleware verifies token
    -> Attaches { sub, email, roles } to req.user

Token Expired (401 response)
    -> Client sends: POST /auth/refresh { refreshToken }
    -> Server finds UserSession by refreshToken
    -> Validates: not revoked, not expired
    -> Issues new token pair
    -> Updates UserSession with new refreshToken
    -> Returns new tokens

Logout
    -> POST /auth/logout { refreshToken }
    -> Sets revokedAt on UserSession
    -> Token can no longer be refreshed
```

### 5.3 Social Login (Google OAuth)

```
Client -> Firebase SDK -> Google OAuth -> Firebase ID Token
    -> POST /auth/social { idToken }
    -> Firebase Admin verifies idToken
    -> Extract email and name from Firebase user
    -> Find or create User (new users get random passwordHash)
    -> Assign "User" role and create ApiProvider
    -> Create UserSession
    -> Issue JWT tokens
    -> Return user + tokens
```

### 5.4 Password Security

- Hashed with bcrypt (10 salt rounds)
- Minimum 8 characters enforced by Zod
- Change password requires current password verification
- Failed login tracking via `failedLoginAttempts` field

---

## 6. Role-Based Access Control

### 6.1 Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| **SuperAdmin** | Platform administrator | `*` (wildcard -- full access) |
| **User** | Regular user (consumer + provider) | `apis.manage_own`, `apis.view`, `subscriptions.manage_self`, `analytics.provider`, `analytics.consumer` |

### 6.2 Middleware

**`requireRole(...roles)`**: Checks if `req.user.roles` includes any of the specified roles. SuperAdmin bypasses all role checks.

**`requirePermission(permission)`**: Checks the permission matrix. SuperAdmin has wildcard `*`. Used less frequently than requireRole.

### 6.3 Route Protection

- Public routes: No middleware
- Consumer routes: `authenticateJWT` only
- Provider routes: `authenticateJWT` + `requireRole("User")`
- Admin routes: `authenticateJWT` + `requireRole("SuperAdmin")`

---

## 7. Gateway Architecture

### 7.1 Request Flow

```
Consumer Request (ANY method)
    |
    +-- Extract :apiSlug from URL
    +-- Look up Api by slug (must exist)
    +-- Extract X-API-Key header (required)
    +-- Validate API key:
    |     - Key exists and isActive=true
    |     - Key not revoked (revokedAt is null)
    |     - Subscription status is ACTIVE
    |     - API status is LIVE
    |
    +-- Check monthly quota:
    |     - Count UsageLog entries for subscription in current calendar month
    |     - If monthlyQuota is set and count >= quota -> 429
    |     - null quota = unlimited
    |
    +-- Check per-minute rate limit (Redis):
    |     - Key: rate:{apiKeyId}:{apiId}
    |     - Algorithm: Sliding window using sorted sets
    |     - ZREMRANGEBYSCORE (remove entries older than 60s)
    |     - ZADD (add current timestamp)
    |     - ZCARD (count entries in window)
    |     - EXPIRE (set 60s TTL on key)
    |     - If count > publicRateLimitPerMinute -> 429
    |
    +-- Forward request to api.baseUrl + path:
    |     - Strip internal headers (host, connection, x-api-key, etc.)
    |     - Forward method, headers, body via Axios
    |     - Measure latency
    |
    +-- Log usage to UsageLog table:
    |     - apiId, apiKeyId, subscriptionId, userId
    |     - path, method, statusCode, latencyMs
    |     - bytesIn, bytesOut
    |
    +-- Return response to consumer:
          - Forward status code
          - Forward response headers (skip content-encoding, transfer-encoding)
          - Forward response body
```

### 7.2 Rate Limiting Details

- **Algorithm**: Sliding window counter using Redis Sorted Sets (ZSET)
- **Window**: 60 seconds
- **Key format**: `rate:{apiKeyId}:{apiId}`
- **Limit source**: `Api.publicRateLimitPerMinute` field
- **null limit**: No rate limiting applied
- **Violation response**: `429 Too Many Requests`

---

## 8. Payment Integration (Razorpay)

### 8.1 Payment Flow

```
1. Consumer subscribes to paid plan
   POST /subscriptions -> Subscription (PENDING)

2. Create order
   POST /billing/subscriptions/order
   -> Load subscription + plan
   -> Create Invoice (PENDING, amount from plan.priceMonthly)
   -> Call Razorpay API: POST /orders (amount, currency, notes)
   -> Create Payment (PENDING, externalPaymentId = order.id)
   -> Return { invoice, payment, razorpayOrder, keyId, testMode }

3. Client opens Razorpay Checkout
   -> User completes payment in Razorpay UI

4. Verify payment
   POST /billing/payments/razorpay/verify
   -> Find Payment by razorpay_order_id
   -> Verify invoice belongs to current user
   -> Verify HMAC-SHA256 signature:
      HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, keySecret)
   -> Confirm payment captured via Razorpay API
   -> Update Payment -> SUCCEEDED
   -> Update Invoice -> PAID (set paidAt)
   -> Activate Subscription -> ACTIVE (set startedAt, endsAt = +30 days)
   -> Send payment success notification
   -> Audit log

5. Consumer generates API keys and calls APIs
```

### 8.2 Amount Handling

- **Currency**: INR (Indian Rupees)
- **Storage unit**: Paise (smallest currency unit, 1 INR = 100 paise)
- **Example**: 999 INR stored as `99900`
- **Benefit**: Avoids floating-point precision issues

### 8.3 Payment Retry

- **Trigger**: Background job runs every 24 hours
- **Eligibility**: status=FAILED, retryCount < maxRetries (3), lastRetryAt > 24h ago or null
- **Process**: Create new Razorpay order with same amount/notes, update Payment
- **Exhaustion**: After max retries -> Invoice=FAILED, Subscription=EXPIRED
- **Manual retry**: `POST /billing/payments/:paymentId/retry`

### 8.4 Test Mode

When `RAZORPAY_TEST_MODE=true`:
- Uses test Razorpay keys
- `POST /billing/test/payments/:orderId/simulate` endpoint available
- Simulation directly updates Payment/Invoice/Subscription without Razorpay

---

## 9. Background Jobs

### 9.1 Queues

| Queue | Worker File | Schedule | Purpose |
|-------|------------|----------|---------|
| `email-notifications` | email.worker.ts | On demand | Process email notifications (currently no-op) |
| `subscription-expiry` | subscriptionExpiry.worker.ts | Every 24h (initial delay: 3 min) | Check expiring subscriptions, send warnings |
| `payment-retry` | usageAggregation.worker.ts | Every 24h (initial delay: 2 min) | Retry failed payments |

### 9.2 Subscription Expiry Worker

1. Find ACTIVE subscriptions with `endsAt` in the next 7 days
2. For each subscription:
   - If 7, 3, or 1 days remaining: send expiring email notification
   - If `endsAt` has passed: update status to EXPIRED
3. Scheduled from `server.ts` via `setTimeout` (180s) + `setInterval` (24h)

### 9.3 Payment Retry Worker

1. Find FAILED payments eligible for retry
2. For each payment: call `billingService.retryFailedPayment(paymentId)`
3. On failure after max retries: mark Invoice FAILED, Subscription EXPIRED
4. Scheduled from `server.ts` via `setTimeout` (120s) + `setInterval` (24h)

### 9.4 Infrastructure

- **Broker**: Redis (shared with rate limiting)
- **Worker startup**: Lazy-imported in `server.ts` (importing triggers Worker instantiation)
- **Job options**: `removeOnComplete: true` to prevent Redis memory growth
- **Error handling**: Workers catch errors, log, and rethrow for BullMQ retry (3 attempts, exponential backoff)

---

## 10. Error Handling

### 10.1 Response Format

All errors return a consistent JSON structure:

```json
{
  "success": false,
  "message": "Human-readable error description",
  "details": {}
}
```

### 10.2 Error Layers

| Layer | Error Type | HTTP Status | Example |
|-------|-----------|-------------|---------|
| 1 | ZodError (validation) | 400 | "API Name must be at least 3 characters." |
| 2 | AppError (business logic) | Custom | "Unauthorized" (401), "Not found" (404) |
| 3 | Prisma P2002 (unique constraint) | 409 | "A record with this slug already exists." |
| 3 | Prisma P2025 (not found) | 404 | "Record not found" |
| 3 | Other Prisma errors | 500 | "Database error occurred" |
| 4 | Unknown errors | 500 | "Internal Server Error" |

### 10.3 Field Labels

Zod validation errors use friendly field labels:

| Field | Label |
|-------|-------|
| name | API Name |
| slug | Slug |
| category | Category |
| description | Description |
| providerDisplayName | Provider Display Name |
| rateLimits | Rate Limits Description |

### 10.4 HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful read/update |
| 201 | Created | Successful create (register, subscribe, create API) |
| 400 | Bad Request | Zod validation failure, missing required fields |
| 401 | Unauthorized | Missing/invalid JWT or API key |
| 403 | Forbidden | Insufficient role or permission |
| 404 | Not Found | Resource doesn't exist, Prisma P2025 |
| 409 | Conflict | Duplicate email/slug, Prisma P2002 |
| 410 | Gone | Disabled feature (email notifications) |
| 429 | Too Many Requests | Rate limit or monthly quota exceeded |
| 500 | Internal Server Error | Database or unexpected errors |
| 502 | Bad Gateway | Upstream API forwarding failed |

---

## 11. Module Breakdown

### 11.1 Auth Module

**Files**: auth.routes.ts, auth.service.ts, middleware/authenticate.ts

**Purpose**: User registration, login (password + OAuth), token lifecycle, profile management.

**Key logic**:
- `register()`: bcrypt hash -> create User -> assign User role -> upsert ApiProvider -> send welcome email -> audit log
- `login()`: Verify password -> create UserSession -> issue tokens -> update lastLoginAt -> audit
- `refresh()`: Find session by refreshToken -> validate not revoked/expired -> re-issue tokens
- `loginWithProvider()`: Verify Firebase idToken -> find/create user -> ensure role and provider -> create session

### 11.2 APIs Module

**Files**: apis.routes.ts, apis.service.ts

**Purpose**: API catalog CRUD, pricing plans, lifecycle management.

**Key logic**:
- `createApi()`: Check slug uniqueness -> create/upsert ApiProvider -> create Api
- `addPlan()`: For FREE plans, force priceMonthly=0 -> create ApiPlan
- `deletePlan()`: Verify ownership -> block if plan has ACTIVE subscriptions
- `changeStatus()`: Update status -> send notification email to provider
- `listPublicApis()`: Filter to LIVE only -> search by name/description -> paginate

### 11.3 Subscriptions Module

**Files**: subscriptions.routes.ts, subscriptions.service.ts

**Purpose**: Subscribe to plans, API key lifecycle, usage and purchase history.

**Key logic**:
- `subscribe()`: Free tier -> ACTIVE immediately; paid -> PENDING (awaits payment)
- `createApiKey()`: Only if subscription ACTIVE -> generate `key_<uuid>`
- `getDetailedUsageStats()`: Per subscription: request counts, quota percentage
- `getPurchaseHistory()`: Join subscriptions with payments via payload.notes.subscriptionId

### 11.4 Billing Module

**Files**: billing.routes.ts, billing.service.ts

**Purpose**: Razorpay payment processing, invoices, payment retry.

**Key logic**:
- `createSubscriptionOrder()`: Create Invoice + Razorpay order + Payment record
- `verifyRazorpayCheckoutPayment()`: HMAC verification + Razorpay API confirmation + activate subscription
- `retryFailedPayment()`: Create new Razorpay order for failed payment
- `simulateTestPayment()`: Direct status update without Razorpay (test mode only)

### 11.5 Gateway Module

**Files**: gateway.routes.ts, gateway.service.ts

**Purpose**: API request proxying with authentication, rate limiting, and usage logging.

**Key logic**:
- `validateApiKey()`: Check key active, subscription ACTIVE, API LIVE
- `checkMonthlyQuota()`: Count UsageLogs in current month vs plan quota
- `checkRateLimit()`: Redis sorted set sliding window (60s)
- `forwardRequest()`: Validate -> rate limit -> forward via Axios -> log usage

### 11.6 Analytics Module

**Files**: analytics.routes.ts, analytics.service.ts

**Purpose**: Revenue reporting, sales history, admin finance dashboard.

**Key logic**:
- `getProviderRevenue()`: Match payments to provider's APIs -> apply commission rate -> time series
- `getProviderSales()`: Subscriptions for provider's APIs with payment data
- `getAdminFinanceDetails()`: Global invoice aggregates, monthly breakdown

### 11.7 Audit Module

**Files**: audit.routes.ts, audit.service.ts

**Purpose**: Compliance logging and user activity history.

**Key logic**:
- `log()`: Fire-and-forget write to AuditLog (catches errors to never block main flow)
- `GET /audit-logs`: Cursor-based pagination (take limit+1, check hasMore)

### 11.8 Notifications Module

**Files**: notifications.routes.ts, notification.service.ts

**Purpose**: Email notification interface (currently disabled).

**Key logic**:
- `NotificationService`: All methods are no-ops (log and return false)
- Other modules call NotificationService so email can be enabled later without code changes
- Route returns 410 Gone

### 11.9 RBAC Module

**Files**: middleware/rbac.ts, repositories/role.repository.ts

**Purpose**: Role and permission enforcement.

**Key logic**:
- `requireRole()`: Check req.user.roles array; SuperAdmin bypasses
- `requirePermission()`: Check against permission matrix
- `RoleRepository`: findByName() and assignRoleToUser() with upsert

---

## 12. Environment Variables

### 12.1 Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_ACCESS_SECRET` | Access token signing key |
| `JWT_REFRESH_SECRET` | Refresh token signing key |

### 12.2 Razorpay

| Variable | Default | Description |
|----------|---------|-------------|
| `RAZORPAY_TEST_MODE` | `true` | Use test keys when true |
| `RAZORPAY_TEST_KEY_ID` | - | Required when test mode |
| `RAZORPAY_TEST_KEY_SECRET` | - | Required when test mode |
| `RAZORPAY_KEY_ID` | - | Required when production mode |
| `RAZORPAY_KEY_SECRET` | - | Required when production mode |

### 12.3 Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `CORS_ORIGIN` | `*` | Allowed CORS origin |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | - | Path or JSON for Firebase Admin |
| `PROVIDER_COMMISSION_RATE` | `0.1` | Platform commission (0-1) |
| `SCHEDULE_PAYMENT_RETRIES` | `true` | Enable payment retry job |
| `SCHEDULE_SUBSCRIPTION_EXPIRY` | `true` | Enable subscription expiry job |
| `EMAIL_ENABLED` | `true` | Enable email transport |
| `EMAIL_HOST` | `smtp.gmail.com` | SMTP host |
| `EMAIL_PORT` | `587` | SMTP port |
| `EMAIL_USER` | - | SMTP username |
| `EMAIL_PASSWORD` | - | SMTP password |

---

## 13. NPM Scripts

```bash
npm run dev              # Hot-reload dev server (ts-node-dev)
npm run build            # Compile TypeScript to dist/
npm run start            # Run compiled production build
npm run lint             # ESLint check
npm run prisma:generate  # Regenerate Prisma client from schema
npm run prisma:migrate   # Create and apply migration (development)
npm run prisma:deploy    # Apply pending migrations (production)
npm run prisma:seed      # Seed roles (SuperAdmin + User)
```

---

## 14. Production Deployment

### 14.1 Build and Run

```bash
npm run build
npx prisma migrate deploy
npx prisma db seed
NODE_ENV=production npm start
```

### 14.2 Docker

The `Dockerfile` uses a multi-stage build:
1. **Builder stage**: Install dependencies, generate Prisma client, compile TypeScript
2. **Runner stage**: Copy compiled `dist/`, `prisma/`, and `node_modules/`

### 14.3 Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong, unique JWT secrets (`openssl rand -base64 32`)
- [ ] Set `CORS_ORIGIN` to frontend domain (not `*`)
- [ ] Set `RAZORPAY_TEST_MODE=false` with production keys
- [ ] Configure `FIREBASE_SERVICE_ACCOUNT_KEY`
- [ ] Ensure PostgreSQL and Redis are accessible and secured
- [ ] Run database migrations (`prisma migrate deploy`)
- [ ] Seed roles (`prisma db seed`)
- [ ] Set up process manager (PM2, systemd, or container orchestrator)
- [ ] Configure logging and monitoring
- [ ] Enable HTTPS/TLS

---

*End of backend documentation.*
