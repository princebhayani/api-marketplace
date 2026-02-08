# API Marketplace Backend -- Architecture Document

> **Last updated:** 2026-02-08
> **Stack:** Node.js 18+ | Express 4.x | TypeScript 5.x | PostgreSQL 15+ (Prisma ORM) | Redis 7+ | BullMQ | JWT | Firebase Admin | Razorpay

---

## Table of Contents

1. [High-Level Architecture Diagram](#1-high-level-architecture-diagram)
2. [Design Patterns](#2-design-patterns)
3. [Module Dependency Graph](#3-module-dependency-graph)
4. [Request Lifecycle](#4-request-lifecycle)
5. [Data Flow Diagrams](#5-data-flow-diagrams)
6. [Database Design Decisions](#6-database-design-decisions)
7. [Caching Strategy](#7-caching-strategy)
8. [Security Architecture](#8-security-architecture)
9. [Background Job Architecture](#9-background-job-architecture)
10. [Error Handling Architecture](#10-error-handling-architecture)
11. [Scaling Considerations](#11-scaling-considerations)
12. [Config Management](#12-config-management)

---

## 1. High-Level Architecture Diagram

```
                                    EXTERNAL SERVICES
                          +-------------------------------+
                          |  Firebase Auth   |  Razorpay  |
                          |  (OAuth/IDToken  |  (Payment  |
                          |   Verification)  |  Gateway)  |
                          +--------+---------+-----+------+
                                   |               |
    CLIENT TIER                    |               |           BACKGROUND TIER
 +---------------+                 |               |        +-------------------+
 |               |                 |               |        |                   |
 | Browser / SPA |                 |               |        |  BullMQ Workers   |
 | Mobile App    |                 |               |        |                   |
 | CLI / SDK     |                 |               |        | +---------------+ |
 |               |                 |               |        | | email-        | |
 +-------+-------+                 |               |        | | notifications | |
         |                         |               |        | +---------------+ |
         | HTTPS                   |               |        | | subscription- | |
         v                         |               |        | | expiry        | |
 +-------+-------+                 |               |        | +---------------+ |
 |               |                 |               |        | | payment-      | |
 |     Nginx     |                 |               |        | | retry         | |
 |  (Reverse     |                 |               |        | +------+--------+ |
 |   Proxy)      |                 |               |        +--------+---------+
 +-------+-------+                 |               |                 |
         |                         |               |                 |
         | HTTP :4000              |               |                 |
         v                         |               |                 |
 +-------+---------------------------------------------------------+---------+
 |                         EXPRESS APPLICATION                                |
 |                                                                            |
 |  +------------------------------------------------------------------+     |
 |  |                    MIDDLEWARE PIPELINE                             |     |
 |  |                                                                   |     |
 |  |  Helmet --> CORS --> JSON Parser --> RequestLogger --> Routes      |     |
 |  |                                                    --> ErrorHandler|     |
 |  +------------------------------------------------------------------+     |
 |                                                                            |
 |  +------------------------------------------------------------------+     |
 |  |                    ROUTE HANDLERS                                 |     |
 |  |                                                                   |     |
 |  |  /auth/*          --> AuthService                                 |     |
 |  |  /provider/apis/* --> ApisService                                 |     |
 |  |  /admin/apis/*    --> ApisService                                 |     |
 |  |  /apis/*          --> ApisService (public)                        |     |
 |  |  /subscriptions/* --> SubscriptionsService                        |     |
 |  |  /billing/*       --> BillingService                              |     |
 |  |  /gateway/:slug/* --> GatewayService                              |     |
 |  |  /analytics/*     --> AnalyticsService                            |     |
 |  |  /audit-logs/*    --> Prisma (direct)                             |     |
 |  |  /notifications/* --> NotificationService                         |     |
 |  +------------------------------------------------------------------+     |
 |                                                                            |
 +-----+-----------------------------+-----------------------------+----------+
       |                             |                             |
       v                             v                             v
 +-----+------+            +---------+---------+          +--------+--------+
 |            |            |                   |          |                 |
 | PostgreSQL |            |      Redis        |          | Target APIs     |
 | (Prisma)   |            |                   |          | (Upstream)      |
 |            |            | - Rate Limiting   |          |                 |
 | 13 Models  |            | - BullMQ Queues   |          | Forwarded via   |
 | 6 Enums    |            | - Sorted Sets     |          | axios           |
 |            |            |                   |          |                 |
 +------------+            +-------------------+          +-----------------+
```

---

## 2. Design Patterns

### 2.1 Modular Monolith

The application is a single Express process organized into **feature-based modules**. Each
module lives under `src/modules/<name>/` and encapsulates its own routes, service, and
(optionally) repository and middleware.

```
src/modules/
  auth/
    auth.routes.ts          # Route definitions + Zod schemas
    auth.service.ts         # Business logic (AuthService class)
    middleware/
      authenticate.ts       # JWT verification middleware
  apis/
    apis.routes.ts
    apis.service.ts
  subscriptions/
    subscriptions.routes.ts
    subscriptions.service.ts
  billing/
    billing.routes.ts
    billing.service.ts
  gateway/
    gateway.routes.ts
    gateway.service.ts
  analytics/
    analytics.routes.ts
    analytics.service.ts
  notifications/
    notification.service.ts
    notifications.routes.ts
  audit/
    audit.service.ts
    audit.routes.ts
  rbac/
    middleware/rbac.ts
    repositories/role.repository.ts
```

All modules are composed inside a single Express app via `registerRoutes()` in
`src/routes.ts`. There is **no inter-process communication**; modules import each
other directly as TypeScript imports. This gives the benefits of bounded contexts
(clear ownership, discoverable code) without the operational cost of microservices.

### 2.2 Service Layer

Every module follows the pattern: **thin route handler --> service class**.

Route handlers are responsible for:
- Parsing and validating input with **Zod schemas**
- Extracting the authenticated user from `req.user`
- Delegating to the service
- Serializing the response

Services are responsible for:
- All business logic and orchestration
- Database access via Prisma
- External API calls (Razorpay, Firebase, upstream APIs)
- Calling other services (e.g., `AuthService` calls `NotificationService`)

Example from `auth.routes.ts`:

```typescript
router.post("/register", async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);                // Validation
    const result = await authService.register(body.email, ...); // Delegation
    res.status(201).json({ success: true, ...result });         // Response
  } catch (err) {
    next(err);                                                  // Error propagation
  }
});
```

### 2.3 Repository Pattern

Used selectively. The RBAC module employs `RoleRepository` to abstract role
lookups and assignments:

```typescript
// src/modules/rbac/repositories/role.repository.ts
export class RoleRepository {
  findByName(name: string) {
    return prisma.role.findUnique({ where: { name } });
  }
  async assignRoleToUser(userId: string, roleName: string) {
    const role = await this.findByName(roleName);
    if (!role) throw new Error(`Role not found: ${roleName}`);
    return prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      update: {},
      create: { userId, roleId: role.id },
    });
  }
}
```

Other modules (Auth, Billing, Subscriptions, etc.) access Prisma directly from
their service classes. This is a pragmatic choice: the repository abstraction is
used where query logic is reusable or complex enough to warrant it.

### 2.4 Middleware Pipeline

Express middleware is registered in a strict order in `server.ts`:

```
Request
  |
  v
[1] helmet()             -- Security headers (X-Frame-Options, CSP, etc.)
  |
  v
[2] cors({ origin })     -- CORS with configurable origin
  |
  v
[3] json()               -- Body parser (application/json)
  |
  v
[4] requestLogger        -- Logs "METHOD /path" to console
  |
  v
[5] Route Handlers        -- Matched route (auth, apis, gateway, etc.)
  |     |
  |     +--> authenticateJWT  (per-route, not global)
  |     +--> requireRole()    (per-route, not global)
  |     +--> Zod validation   (inline in handler)
  |     +--> Service call
  |
  v
[6] errorHandler          -- Catches all thrown/nexted errors
  |
  v
Response
```

Key design choice: authentication and authorization middleware are applied **per
route**, not globally. This allows public routes (e.g., `GET /apis`, `GET /health`,
`POST /auth/register`) to bypass JWT checks entirely.

### 2.5 Singleton

Two critical resources are instantiated as module-level singletons:

| Singleton          | File                  | Mechanism                           |
|--------------------|-----------------------|-------------------------------------|
| `prisma`           | `src/config/prisma.ts`| `new PrismaClient()` exported once  |
| `redisClient`      | `src/config/redis.ts` | `createClient()` exported once      |

Node.js module caching ensures these are created exactly once regardless of how
many modules import them. Workers duplicate the Redis connection via
`redisClient.duplicate()` to avoid blocking the main client.

### 2.6 Factory

Service classes are instantiated at the module level within route files:

```typescript
// billing.routes.ts
const service = new BillingService();

// gateway.routes.ts
const service = new GatewayService();

// auth.routes.ts
const authService = new AuthService();
```

Inside services, dependent services are also instantiated at module scope:

```typescript
// auth.service.ts
const roleRepo = new RoleRepository();
const notificationService = new NotificationService();
```

This is a lightweight factory approach -- the route file acts as the composition
root for its module.

### 2.7 Fire-and-Forget

Non-critical side effects (audit logging, notification emails) are executed
without `await`, using `.catch()` to silently log errors:

```typescript
// Audit logging -- never blocks the main flow
auditLog.log({
  userId: user.id,
  action: "USER_REGISTERED",
  entity: "User",
  entityId: user.id,
  metadata: { email: user.email },
});

// Notification emails -- promise rejection is caught and logged
notificationService.sendWelcomeEmail(user.id, user.email, user.name)
  .catch((err) => logger.error("Failed to send welcome email", err));
```

The `auditService.log()` method itself wraps the Prisma call in a try/catch
so it **never throws**, making it safe to call without awaiting:

```typescript
async log(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({ data: { ... } });
  } catch (err) {
    logger.error("Audit log write failed", { error: err, params });
  }
}
```

---

## 3. Module Dependency Graph

```
                        +------------------+
                        |   auth module    |
                        |                  |
                        | AuthService      |
                        +--+--+--+--+-----+
                           |  |  |  |
              +------------+  |  |  +------------------+
              |               |  |                     |
              v               v  v                     v
     +--------+---+    +------+--+------+    +---------+--------+
     | rbac       |    | notifications  |    | audit            |
     | module     |    | module         |    | module           |
     |            |    |                |    |                  |
     | RoleRepo   |    | Notification   |    | auditLog         |
     | requireRole|    | Service        |    | (fire-and-forget)|
     +------+-----+    +-------+--------+    +------------------+
            |                   |                     ^
            |                   |                     |
            v                   v                     |
     +------+-----+    +-------+--------+             |
     | Prisma     |    | BullMQ Queue   |             |
     | (User,Role |    | email-notif    |             |
     |  UserRole) |    +----------------+             |
     +------------+                                   |
                                                      |
     +------------------+     +------------------+    |
     | apis module      |     | subscriptions    |    |
     |                  |     | module           |    |
     | ApisService      |     |                  |    |
     +--+--+------------+     | Subscriptions    +----+
        |  |                  | Service          |
        |  +---> notifications+--+--+------------+
        |                        |  |
        v                        |  +---> audit module
     +--+-------+               |
     | Prisma   |               v
     | (Api,    |        +------+-------+
     | ApiPlan, |        | Prisma       |
     | ApiProv) |        | (Subscription|
     +----------+        |  ApiKey,     |
                         |  UsageLog)   |
     +------------------++------+-------+
     | billing module   |
     |                  |
     | BillingService   +----------> Razorpay API (external)
     +--+--+--+---------+
        |  |  |
        |  |  +---> notifications module
        |  +------> audit module
        v
     +--+----------+
     | Prisma      |
     | (Invoice,   |
     |  Payment,   |
     |  Subscription|
     +-------------+

     +------------------+
     | gateway module   |
     |                  |
     | GatewayService   +----------> Target APIs (external, via axios)
     +--+--+------------+
        |  |
        |  +---> Redis (rate limiting)
        v
     +--+----------+
     | Prisma      |
     | (ApiKey,    |
     |  Subscription|
     |  UsageLog,  |
     |  Api)       |
     +-------------+

     +------------------+
     | analytics module |
     |                  |
     | AnalyticsService |
     +--+---------------+
        |
        v
     +--+----------+
     | Prisma      |
     | (UsageLog,  |
     |  Invoice,   |
     |  Payment,   |
     |  Subscription|
     |  ApiProvider)|
     +-------------+
```

### Cross-Module Import Summary

| Module          | Depends On                                    |
|-----------------|-----------------------------------------------|
| auth            | rbac, notifications, audit, firebase, prisma   |
| apis            | notifications, prisma                          |
| subscriptions   | notifications, audit, prisma                   |
| billing         | notifications, audit, prisma, Razorpay (ext)   |
| gateway         | prisma, Redis (rate limiting)                   |
| analytics       | prisma                                         |
| audit           | prisma (self-contained)                        |
| rbac            | prisma (self-contained)                        |
| notifications   | logger only (currently no-op)                  |

---

## 4. Request Lifecycle

Below is the complete lifecycle of an authenticated request, step by step.

```
+----------+      +-------+      +---------+      +----------+      +----------+
|  Client  | ---> | Nginx | ---> | Express | ---> |  Route   | ---> | Service  |
+----------+      +-------+      +---------+      | Handler  |      |  Layer   |
                                                   +----------+      +----------+
                                                                          |
                                                                          v
                                                                     +----------+
                                                                     |  Prisma  |
                                                                     | /Redis/  |
                                                                     | External |
                                                                     +----------+
```

### Detailed Steps

```
1. CLIENT sends HTTP request
   POST /subscriptions  { "apiPlanId": "uuid-here" }
   Authorization: Bearer <access_token>

2. NGINX (reverse proxy)
   - TLS termination
   - Forward to Express on port 4000
   - Add X-Forwarded-For, X-Real-IP headers

3. EXPRESS MIDDLEWARE CHAIN (in order)

   3a. helmet()
       - Sets security headers: X-Content-Type-Options, X-Frame-Options,
         Strict-Transport-Security, Content-Security-Policy, etc.

   3b. cors({ origin: config.corsOrigin })
       - Validates Origin header against configured CORS_ORIGIN
       - Sets Access-Control-Allow-Origin, Allow-Methods, Allow-Headers
       - For preflight (OPTIONS), responds 204 immediately

   3c. json()
       - Parses request body as JSON
       - Sets req.body = { apiPlanId: "uuid-here" }

   3d. requestLogger
       - Logs: "POST /subscriptions"
       - Calls next()

4. ROUTE MATCHING
   - Express matches POST /subscriptions to subscriptionsRouter
   - Route definition: router.post("/", authenticateJWT, async handler)

5. AUTHENTICATION MIDDLEWARE (authenticateJWT)
   - Extracts "Bearer <token>" from Authorization header
   - If missing: next(new AppError("Unauthorized", 401))
   - jwt.verify(token, config.jwtAccessSecret) --> JwtPayload
   - Sets req.user = { sub: "user-uuid", email: "...", roles: ["User"] }
   - Calls next()

6. ROLE MIDDLEWARE (if applied on route, e.g., requireRole("User"))
   - Reads req.user.roles
   - If SuperAdmin: bypass, call next()
   - If role matches: call next()
   - Otherwise: next(new AppError("Forbidden", 403))

7. ROUTE HANDLER
   - Zod validation: subscribeSchema.parse(req.body)
     - If invalid: throws ZodError (caught by error handler)
   - Service call: service.subscribe(req.user.sub, body.apiPlanId)
   - Response: res.status(201).json({ success: true, subscription: sub })

8. SERVICE LAYER (SubscriptionsService.subscribe)
   - Prisma query: find plan by ID
   - Business logic: determine initial status (ACTIVE for free, PENDING for paid)
   - Prisma mutation: create subscription record
   - Fire-and-forget: auditLog.log({ ... })
   - Return result

9. RESPONSE
   - Express serializes JSON
   - Status 201, Content-Type: application/json
   - { success: true, subscription: { id, userId, apiPlanId, status, ... } }

10. ERROR PATH (if any step throws)
    - Error propagated via next(err) or thrown in async handler
    - Caught by errorHandler middleware (step 3e in pipeline)
    - Error classified and mapped to HTTP response (see Section 10)
```

---

## 5. Data Flow Diagrams

### 5.1 Authentication Flow

```
                              REGISTRATION
 +--------+    POST /auth/register     +----------+    hash(password,10)    +--------+
 | Client | -------------------------> | Route    | ----------------------> | bcrypt |
 +--------+    { email, password }     | Handler  |                        +--------+
                                       +-----+----+
                                             |
                                             v
                                       +-----+----+
                                       | Auth     |
                                       | Service  |
                                       +-----+----+
                                             |
                              +--------------+--------------+
                              |              |              |
                              v              v              v
                         +----+---+    +-----+----+   +-----+----+
                         | Create |    | Assign   |   | Create   |
                         | User   |    | "User"   |   | ApiProv  |
                         | (Prisma|    | Role     |   | Record   |
                         +----+---+    +----------+   +----------+
                              |
                              v
                    +---------+---------+
                    | Issue JWT Tokens  |
                    | access  (15m)     |
                    | refresh (30d)     |
                    +---------+---------+
                              |
                              +---> Fire-and-forget: sendWelcomeEmail()
                              +---> Fire-and-forget: auditLog.log()
                              |
                              v
                    +---------+---------+
                    | Return to client  |
                    | { user, tokens }  |
                    +-------------------+


                                LOGIN
 +--------+    POST /auth/login        +----------+
 | Client | -------------------------> | Route    |
 +--------+    { email, password }     | Handler  |
                                       +-----+----+
                                             |
                                             v
                                       +-----+----+
                                       | Auth     |
                                       | Service  |
                                       +-----+----+
                                             |
                              +--------------+--------------+
                              |              |              |
                              v              v              v
                         +----+---+    +-----+----+   +-----+----+
                         | Find   |    | bcrypt   |   | Ensure   |
                         | User   |    | compare  |   | Role +   |
                         | by     |    | password |   | ApiProv  |
                         | email  |    +-----+----+   +----------+
                         +--------+          |
                                             | match?
                                        +----+----+
                                        |  YES    |  NO --> AppError(401)
                                        +----+----+
                                             |
                                             v
                                    +--------+--------+
                                    | Create          |
                                    | UserSession     |
                                    | { refreshToken, |
                                    |   deviceInfo,   |
                                    |   ipAddress,    |
                                    |   expiresAt }   |
                                    +--------+--------+
                                             |
                                             v
                                    Issue JWT tokens + return


                             TOKEN REFRESH
 +--------+    POST /auth/refresh      +----------+
 | Client | -------------------------> | Route    |
 +--------+    { refreshToken }        | Handler  |
                                       +-----+----+
                                             |
                                             v
                                    +--------+--------+
                                    | Find session by |
                                    | refreshToken    |
                                    | (unique index)  |
                                    +--------+--------+
                                             |
                              +--------------+---------+
                              | Valid?                 |
                              | - exists               |
                              | - not revoked          |
                              | - not expired          |
                              +---------+---------+----+
                                   YES  |         | NO --> AppError(401)
                                        v
                              +---------+---------+
                              | Issue new tokens  |
                              | Update session    |
                              | (new refreshToken,|
                              |  new expiresAt)   |
                              +-------------------+


                            OAUTH (Firebase)
 +--------+    POST /auth/social       +----------+
 | Client | -------------------------> | Route    |
 +--------+    { idToken }             | Handler  |
     ^                                 +-----+----+
     |                                       |
     | Firebase SDK                          v
     | (client-side)               +---------+---------+
     |                             | firebaseAuth      |
     +---- Google/GitHub ----+     | .verifyIdToken()  |
           OAuth Provider    |     +---------+---------+
                             |               |
                             |               v
                             |     +---------+---------+
                             |     | Extract email,    |
                             |     | name from token   |
                             |     +---------+---------+
                             |               |
                             |    +----------+----------+
                             |    | User exists?        |
                             |    +---+----------+------+
                             |        |          |
                             |       YES        NO
                             |        |          |
                             |        |    +-----+--------+
                             |        |    | Create user  |
                             |        |    | (random pwd) |
                             |        |    | emailVerified|
                             |        |    +-----+--------+
                             |        |          |
                             |        +----+-----+
                             |             |
                             |             v
                             |    +--------+--------+
                             |    | Ensure role +   |
                             |    | ApiProvider     |
                             |    | Issue tokens    |
                             |    | Create session  |
                             |    +--------+--------+
                             |             |
                             |             v
                             |    Return { user, tokens }
```

### 5.2 Subscription Flow

```
 +--------+                                              +----------+
 | Client |                                              | Database |
 +---+----+                                              +-----+----+
     |                                                         |
     |  1. GET /apis                                           |
     |  (Browse marketplace)                                   |
     | -------------------------------------------------------->
     | <-- { apis: [...], pagination }                         |
     |                                                         |
     |  2. GET /apis/:id                                       |
     |  (View API details + plans)                             |
     | -------------------------------------------------------->
     | <-- { api: { plans: [...] } }                           |
     |                                                         |
     |  3. POST /subscriptions                                 |
     |     { apiPlanId: "..." }                                |
     | -------------------------------------------------------->
     |                                                         |
     |     +--- Is plan free? ---+                             |
     |     |                     |                             |
     |    YES                   NO                             |
     |     |                     |                             |
     |     v                     v                             |
     |  status=ACTIVE      status=PENDING                      |
     |  (immediate)        (awaiting payment)                  |
     |                          |                              |
     | <-- { subscription }     |                              |
     |                          |                              |
     |  4. POST /billing/subscriptions/order                   |
     |     { subscriptionId }                                  |
     | -------------------------------------------------------->
     |                          |                              |
     |         +----------------+---> Create Invoice           |
     |         |                      (PENDING, 30-day period) |
     |         |                                               |
     |         +---> Razorpay API: POST /v1/orders             |
     |         |     { amount, currency, receipt }             |
     |         |                                               |
     |         +---> Create Payment record                     |
     |         |     (PENDING, orderId)                        |
     |         |                                               |
     | <-- { invoice, razorpayOrder, razorpayKeyId }           |
     |                                                         |
     |  5. Client opens Razorpay Checkout                      |
     |     (client-side SDK with orderId + keyId)              |
     |                                                         |
     |  6. POST /billing/payments/razorpay/verify              |
     |     { razorpay_order_id,                                |
     |       razorpay_payment_id,                              |
     |       razorpay_signature }                              |
     | -------------------------------------------------------->
     |         |                                               |
     |         +---> HMAC SHA256 signature verification        |
     |         +---> Razorpay API: GET /v1/payments/:id        |
     |         |     (confirm status = "captured")             |
     |         +---> Payment.status = SUCCEEDED                |
     |         +---> Invoice.status = PAID                     |
     |         +---> Subscription.status = ACTIVE              |
     |         |                                               |
     | <-- { payment, invoice }                                |
     |                                                         |
     |  7. POST /subscriptions/:id/keys                        |
     |     (Create API key for active subscription)            |
     | -------------------------------------------------------->
     | <-- { key: "key_<uuid>" }                               |
     |                                                         |
     |  8. Gateway calls with X-API-Key header                 |
     |     GET /gateway/:apiSlug/endpoint                      |
     | -------------------------------------------------------->
```

### 5.3 Payment Flow

```
                    CREATE ORDER                         VERIFY PAYMENT

 Client              Backend             Razorpay        Client              Backend             Razorpay
   |                    |                    |              |                    |                    |
   | POST /billing/     |                    |              | POST /billing/     |                    |
   | subscriptions/     |                    |              | payments/razorpay/ |                    |
   | order              |                    |              | verify             |                    |
   |------------------->|                    |              |------------------->|                    |
   |                    |                    |              |  { order_id,       |                    |
   |                    | Find subscription  |              |    payment_id,     |                    |
   |                    | + plan + price     |              |    signature }     |                    |
   |                    |                    |              |                    |                    |
   |                    | Create Invoice     |              |                    | HMAC SHA256 verify |
   |                    | (PENDING)          |              |                    | expected =         |
   |                    |                    |              |                    | HMAC(order_id +    |
   |                    | POST /v1/orders    |              |                    |   "|" + payment_id,|
   |                    |------------------->|              |                    |   key_secret)      |
   |                    |                    |              |                    |                    |
   |                    |<--- order response |              |                    | signature match?   |
   |                    |   { id, amount,    |              |                    |---+                |
   |                    |     status,        |              |                    |   |                |
   |                    |     short_url }    |              |                    |  YES               |
   |                    |                    |              |                    |   |                |
   |                    | Create Payment     |              |                    | GET /v1/payments/  |
   |                    | (PENDING)          |              |                    | :payment_id        |
   |                    | payload = order    |              |                    |------------------->|
   |                    |                    |              |                    |                    |
   |<-------------------| Return:            |              |                    |<--- { status:      |
   |  { razorpayOrder,  | - invoice          |              |                    |       "captured" } |
   |    razorpayKeyId,  | - payment          |              |                    |                    |
   |    invoice }       | - keyId            |              |                    | Update records:    |
   |                    |                    |              |                    | Payment -> SUCCEEDED
   |                    |                    |              |                    | Invoice -> PAID    |
   | Open Razorpay      |                    |              |                    | Subscription->     |
   | Checkout (JS SDK)  |                    |              |                    |   ACTIVE           |
   |                    |                    |              |                    |                    |
   | User pays          |                    |              |<-------------------| { payment,         |
   |------------------------------------>    |              |                    |   invoice }        |
   |                    |                    |              |                    |                    |
   | Callback with      |                    |              |                    | Fire-and-forget:   |
   | order_id,          |                    |              |                    | - payment email    |
   | payment_id,        |                    |              |                    | - audit log        |
   | signature          |                    |              |                    |                    |
```

### 5.4 Gateway Flow

```
 Client                        Gateway                       Redis                    Target API
   |                              |                             |                         |
   | GET /gateway/:apiSlug/path   |                             |                         |
   | X-API-Key: key_<uuid>        |                             |                         |
   |----------------------------->|                             |                         |
   |                              |                             |                         |
   |                    +---------+---------+                   |                         |
   |                    | 1. VALIDATE KEY   |                   |                         |
   |                    |                   |                   |                         |
   |                    | Prisma: find      |                   |                         |
   |                    | ApiKey by key     |                   |                         |
   |                    | Include:          |                   |                         |
   |                    |  subscription     |                   |                         |
   |                    |    apiPlan        |                   |                         |
   |                    |      api          |                   |                         |
   |                    |  user             |                   |                         |
   |                    +---------+---------+                   |                         |
   |                              |                             |                         |
   |                    +---------+---------+                   |                         |
   |                    | Checks:           |                   |                         |
   |                    | - key.isActive    |                   |                         |
   |                    | - !key.revokedAt  |                   |                         |
   |                    | - sub.status =    |                   |                         |
   |                    |   ACTIVE          |                   |                         |
   |                    | - api.status =    |                   |                         |
   |                    |   LIVE            |                   |                         |
   |                    +---------+---------+                   |                         |
   |                              |                             |                         |
   |                    +---------+---------+                   |                         |
   |                    | 2. MONTHLY QUOTA  |                   |                         |
   |                    |                   |                   |                         |
   |                    | If plan has quota: |                  |                         |
   |                    | COUNT usageLogs    |                  |                         |
   |                    | WHERE subId AND    |                  |                         |
   |                    |   timestamp >= 1st |                  |                         |
   |                    |   of month         |                  |                         |
   |                    |                   |                   |                         |
   |                    | count >= quota?   |                   |                         |
   |                    | YES --> 429 error  |                  |                         |
   |                    +---------+---------+                   |                         |
   |                              |                             |                         |
   |                    +---------+---------+                   |                         |
   |                    | 3. RATE LIMIT     |                   |                         |
   |                    |                   |                   |                         |
   |                    | key = rate:{id}:{apiId}               |                         |
   |                    | MULTI:            |                   |                         |
   |                    |   ZREMRANGEBYSCORE|------------------->| Remove entries         |
   |                    |     key 0 (now-60s)                   | older than 60s         |
   |                    |   ZADD            |------------------->| Add current timestamp  |
   |                    |     key now now   |                   | score=now, value=now   |
   |                    |   ZCARD           |------------------->| Count entries in set   |
   |                    |     key           |                   |                         |
   |                    |   EXPIRE          |------------------->| Set TTL = 60s          |
   |                    |     key 60        |                   |                         |
   |                    | EXEC              |<------------------| [_, _, count, _]        |
   |                    |                   |                   |                         |
   |                    | count > limit?    |                   |                         |
   |                    | YES --> 429 error |                   |                         |
   |                    +---------+---------+                   |                         |
   |                              |                             |                         |
   |                    +---------+---------+                                             |
   |                    | 4. FORWARD        |                                             |
   |                    |                   |                                             |
   |                    | url = baseUrl +   |                                             |
   |                    |   "/" + path      |                                             |
   |                    |                   |                                             |
   |                    | Filter headers:   |                                             |
   |                    | Remove: host,     |                                             |
   |                    |  connection,      |                                             |
   |                    |  x-api-key,       |                                             |
   |                    |  transfer-encoding|                                             |
   |                    |                   |                                             |
   |                    | axios.request({   |-------------------------------------------->|
   |                    |   url, method,    |                                             |
   |                    |   headers, data,  |                                             |
   |                    |   validateStatus: |                                             |
   |                    |     () => true    |                                             |
   |                    | })                |<--------------------------------------------|
   |                    +---------+---------+   Response                                  |
   |                              |                                                      |
   |                    +---------+---------+                                             |
   |                    | 5. LOG USAGE      |                                             |
   |                    |                   |                                             |
   |                    | Prisma: create    |                                             |
   |                    | UsageLog {        |                                             |
   |                    |   apiId,          |                                             |
   |                    |   apiKeyId,       |                                             |
   |                    |   subscriptionId, |                                             |
   |                    |   userId,         |                                             |
   |                    |   path, method,   |                                             |
   |                    |   statusCode,     |                                             |
   |                    |   latencyMs,      |                                             |
   |                    |   bytesIn,        |                                             |
   |                    |   bytesOut        |                                             |
   |                    | }                 |                                             |
   |                    +---------+---------+                                             |
   |                              |                                                      |
   |<-----------------------------| 6. RETURN                                            |
   |  Forward response status,    | Filter response headers                              |
   |  headers, body               | (remove content-encoding,                            |
   |                              |  transfer-encoding)                                  |
```

---

## 6. Database Design Decisions

### 6.1 Entity-Relationship Overview

```
+--------+     +------+     +----------+
|  User  |<--->| Role |     |          |
|        |     |      |     | ApiProv  |
| id(UUID|     | id   |     | ider     |
| email  |     | name |     |          |
| pwdHash|     +------+     | userId   |
+---+----+       ^          +----+-----+
    |            |                |
    | 1:N   N:M (UserRole)       | 1:N
    |            |                |
    v            |                v
+---+--------+  |          +-----+----+
|UserSession |  |          |   Api    |
| refreshToken  |          | slug(uniq|
| expiresAt  |  |          | baseUrl  |
| revokedAt  |  |          | status   |
+------------+  |          +----+-----+
    |           |               |
    |     +-----+------+       | 1:N
    |     |  UserRole  |       |
    |     | userId     |       v
    |     | roleId     |  +----+-----+
    |     | @@id([u,r])|  | ApiPlan  |
    |     +------------+  | billing  |
    |                     | Type     |
    |                     | price    |
    |                     | Monthly  |
    |                     +----+-----+
    |                          |
    |                          | 1:N
    |                          |
    |    +-------+        +----+---------+       +----------+
    +--->|ApiKey |<-------+ Subscription |------>| Invoice  |
         | key   |        | status       |       | amount   |
         |(unique|        | endsAt       |       | status   |
         +-------+        +--------------+       | apiId    |
                                                 +----+-----+
                                                      |
                                                      | 1:N
                                                      v
                                                 +----+-----+
    +----------+                                 | Payment  |
    | UsageLog |                                 | provider |
    | apiId    |                                 | external |
    | apiKeyId |                                 | PaymentId|
    | path     |                                 | payload  |
    | method   |                                 | (JSON)   |
    | status   |                                 | retry    |
    | Code     |                                 | Count    |
    | latencyMs|                                 +----------+
    | bytesIn  |
    | bytesOut |                                 +----------+
    +----------+                                 | AuditLog |
                                                 | action   |
                                                 | entity   |
                                                 | entityId |
                                                 | metadata |
                                                 | (JSON)   |
                                                 +----------+
```

### 6.2 Models (13) and Enums (6)

| # | Model          | Primary Key    | Notes                                      |
|---|----------------|----------------|--------------------------------------------|
| 1 | User           | `id` (UUID)    | Central identity; all entities reference it |
| 2 | Role           | `id` (autoincrement Int) | Static lookup table (User, SuperAdmin) |
| 3 | UserRole       | `@@id([userId, roleId])` | Composite PK, many-to-many join      |
| 4 | ApiProvider     | `id` (UUID)   | 1:1 with User; created on registration      |
| 5 | Api            | `id` (UUID)    | The API listing; slug is unique             |
| 6 | ApiPlan        | `id` (UUID)    | Pricing tier for an API                     |
| 7 | Subscription   | `id` (UUID)    | Links User to ApiPlan                       |
| 8 | ApiKey         | `id` (UUID)    | `key` field is unique; format: `key_<uuid>` |
| 9 | UsageLog       | `id` (UUID)    | Append-only; high-volume table              |
|10 | Invoice        | `id` (UUID)    | Billing period; tracks payment lifecycle     |
|11 | Payment        | `id` (UUID)    | Maps to Razorpay order; JSON payload         |
|12 | AuditLog       | `id` (UUID)    | Append-only audit trail                     |
|13 | UserSession    | `id` (UUID)    | Refresh token session management            |

| # | Enum              | Values                                |
|---|-------------------|---------------------------------------|
| 1 | ApiStatus         | DRAFT, REVIEW, APPROVED, LIVE, SUSPENDED |
| 2 | BillingType       | SUBSCRIPTION, FREE                    |
| 3 | SubscriptionStatus| PENDING, ACTIVE, CANCELLED, EXPIRED   |
| 4 | InvoiceStatus     | PENDING, PAID, FAILED, CANCELLED      |
| 5 | InvoiceType       | SUBSCRIPTION                          |
| 6 | PaymentStatus     | PENDING, SUCCEEDED, FAILED, REFUNDED  |

### 6.3 UUID Primary Keys

Every model (except Role, which uses autoincrement Int) uses UUID v4 as its
primary key via `@default(uuid())`. This provides:

- **No sequential ID leakage** -- clients cannot enumerate resources
- **Merge-safe** -- UUIDs generated on any node are globally unique
- **Scalability** -- no coordination needed for ID generation

Role uses autoincrement because it is a small, static lookup table (typically
2-3 records), and integer PKs simplify the composite key on UserRole.

### 6.4 Composite Primary Key (UserRole)

```prisma
model UserRole {
  userId String
  roleId Int
  @@id([userId, roleId])
}
```

This ensures a user cannot be assigned the same role twice at the database level.
The composite key eliminates the need for a separate unique constraint and avoids
an extra surrogate ID column.

### 6.5 Strategic Indexes

All indexes defined in the schema, listed by table:

| Table        | Index                                       | Purpose                                    |
|--------------|---------------------------------------------|--------------------------------------------|
| User         | `@unique email`                             | Login lookup, duplicate prevention          |
| User         | `@unique razorpayCustomerId`                | Razorpay customer deduplication             |
| Api          | `@unique slug`                              | URL-friendly unique identifier              |
| ApiKey       | `@unique key`                               | API key lookup in gateway (O(1))            |
| Subscription | `@unique razorpaySubscriptionId`            | External subscription deduplication         |
| UserSession  | `@unique refreshToken`                      | Token refresh lookup (O(1))                 |
| UserSession  | `@@index([userId, createdAt])`              | List user sessions, ordered by time         |
| UsageLog     | `@@index([apiId, timestamp])`               | Provider analytics: usage by API over time  |
| UsageLog     | `@@index([subscriptionId, timestamp])`      | Consumer usage: calls per subscription      |
| UsageLog     | `@@index([userId, timestamp])`              | Per-user usage aggregation                  |
| Invoice      | `@@index([subscriptionId, status, createdAt])` | Find pending invoices for a subscription |
| Invoice      | `@@index([apiId, status])`                  | Provider revenue: paid invoices per API     |
| Invoice      | `@@index([type, status, createdAt])`        | Admin finance: filter by type and status    |
| Payment      | `@@index([status, retryCount])`             | Payment retry worker: find failed, eligible |
| Payment      | `@@index([invoiceId, status])`              | Payment status lookup per invoice           |
| AuditLog     | `@@index([userId, createdAt])`              | User activity timeline, cursor pagination   |

### 6.6 Amount Storage in Paise

All monetary amounts (`ApiPlan.priceMonthly`, `Invoice.amount`, `Payment.amount`)
are stored as **integers in the smallest currency unit** (paise for INR).

```
1 INR = 100 paise
priceMonthly: 49900  -->  499.00 INR
```

Benefits:
- No floating-point precision errors
- Direct compatibility with Razorpay API (which expects amounts in paise)
- Simpler arithmetic (integer addition, no rounding needed)

### 6.7 JSON Field: Payment.payload

```prisma
model Payment {
  payload Json   // Stores the full Razorpay order/payment response
}
```

The `payload` field stores the complete Razorpay API response as JSON. This provides:

- **Full audit trail** of the external payment state
- **Schema flexibility** -- Razorpay's response structure can change without migrations
- **Debug capability** -- every field from Razorpay is preserved
- **Revenue attribution** -- `payload.notes.subscriptionId` and `payload.notes.apiId`
  are used to attribute payments to providers, surviving subscription deletion

The `RazorpayPayload` TypeScript interface provides type safety at the application
layer:

```typescript
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
```

### 6.8 Invoice.apiId for Deleted Subscriptions

```prisma
model Invoice {
  apiId String?  // Kept when subscription is deleted so provider earnings still attribute
}
```

When a subscription is deleted, `subscriptionId` becomes `null` (via `onDelete: SetNull`).
However, `apiId` is stored directly on the invoice so that **provider revenue
attribution survives subscription deletion**. The analytics service checks both
`payload.notes.apiId` and `invoice.apiId` when calculating revenue.

---

## 7. Caching Strategy

### 7.1 Redis for Rate Limiting (Sliding Window Algorithm)

The gateway module implements a **sliding window rate limiter** using Redis
sorted sets. This is the only application-level caching in the system.

```
Algorithm: Sorted-Set Sliding Window
Key pattern: rate:{identifier}:{apiId}
Window: 60 seconds (WINDOW_MS = 60_000)
```

**Step-by-step operation (executed as a Redis MULTI/EXEC transaction):**

```
1. ZREMRANGEBYSCORE key 0 (now - 60000)
   Remove all entries with score (timestamp) older than 60 seconds ago.
   This slides the window forward.

2. ZADD key {score: now, value: now.toString()}
   Add the current request's timestamp to the sorted set.
   Both score and value are the current timestamp in milliseconds.

3. ZCARD key
   Count all remaining entries in the sorted set.
   This is the number of requests in the current 60-second window.

4. EXPIRE key 60
   Set a TTL of 60 seconds as a safety net to prevent orphaned keys
   if no more requests arrive.
```

**Why sorted sets?**

```
Traditional approaches:
  Fixed window:  [0s--------60s][60s--------120s]  <-- Boundary spike: 2x burst at window edges
  Token bucket:  Requires separate refill logic

Sliding window (sorted set):
  Request at T=55s:  window = [T-60..T] = [-5s..55s]
  Request at T=65s:  window = [T-60..T] = [5s..65s]
  --> Every request sees exactly the last 60 seconds. No boundary spikes.
```

**Identifier selection:**
- Authenticated requests: `identifier = apiKeyId`
- Unauthenticated requests: `identifier = IP address` (via `rateLimitIdentifier`)
- Fallback: `identifier = "anonymous"`

### 7.2 BullMQ Uses Redis for Queues

BullMQ manages three job queues (see Section 9), all backed by Redis.
Each worker creates a **duplicated Redis connection** to avoid blocking the
main application's Redis client:

```typescript
const connection = redisClient.duplicate() as unknown as ConnectionOptions;
```

### 7.3 No Application-Level DB Caching

The system does **not** cache database query results in Redis. Every request
hits PostgreSQL via Prisma. This is a deliberate choice:

- **Simplicity** -- no cache invalidation logic
- **Consistency** -- reads always reflect the latest state
- **Prisma connection pooling** -- PgBouncer-style pooling at the ORM level
  mitigates cold query overhead

Future optimization candidates:
- API metadata (Api + plans) could be cached for public listing pages
- UsageLog counts for monthly quota checks (currently a DB COUNT per request)

---

## 8. Security Architecture

### 8.1 JWT Token Strategy

```
+------------------+-------------------+---------------------+
|                  |   Access Token    |   Refresh Token     |
+------------------+-------------------+---------------------+
| Lifetime         | 15 minutes        | 30 days             |
| Signing secret   | JWT_ACCESS_SECRET | JWT_REFRESH_SECRET  |
| Algorithm        | HS256 (default)   | HS256 (default)     |
| Payload          | { sub, email,     | { sub, email,       |
|                  |   roles }         |   roles }           |
| Storage (client) | Memory / variable | httpOnly cookie or  |
|                  |                   | secure storage      |
| Revocation       | Not revocable     | Via UserSession     |
|                  | (short-lived)     | .revokedAt field    |
+------------------+-------------------+---------------------+
```

**Separate secrets** for access and refresh tokens prevent a refresh token from
being used as an access token (and vice versa), even if an attacker obtains one.

**Token payload (JwtPayload):**
```typescript
interface JwtPayload {
  sub: string;    // userId (UUID)
  email: string;
  roles: string[];  // ["User"] or ["SuperAdmin"]
}
```

### 8.2 Password Hashing (bcrypt)

```typescript
const passwordHash = await bcrypt.hash(password, 10);  // 10 salt rounds
const ok = await bcrypt.compare(password, user.passwordHash);
```

- **Salt rounds: 10** -- ~100ms per hash on modern hardware; balances security
  and latency
- bcrypt automatically generates a random salt per hash
- The hash includes the salt, algorithm version, and cost factor

### 8.3 Razorpay HMAC SHA256 Verification

```typescript
const expectedSignature = crypto
  .createHmac("sha256", config.razorpayKeySecret)
  .update(`${input.orderId}|${input.paymentId}`)
  .digest("hex");

if (expectedSignature !== input.signature) {
  throw new AppError("Invalid payment signature", 401);
}
```

After HMAC verification passes, the backend also makes a **server-side verification
call** to the Razorpay API to confirm the payment status is `"captured"`. This
two-step verification prevents:
1. Client-side signature forgery (HMAC check)
2. Marking uncaptured/pending payments as successful (API check)

### 8.4 CORS

```typescript
app.use(cors({
  origin: config.corsOrigin,  // Configured via CORS_ORIGIN env var
}));
```

- Default: `"*"` (open, suitable for development)
- Production: should be set to the specific frontend domain

### 8.5 Helmet

```typescript
app.use(helmet());
```

Sets the following security headers (among others):
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 0` (deprecated, relies on CSP instead)
- `Strict-Transport-Security` (HSTS)
- `Content-Security-Policy` (default policy)

### 8.6 Zod Input Validation

Every route that accepts user input validates it with Zod schemas **before**
any business logic executes:

```typescript
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const createApiSchema = z.object({
  name: z.string().min(3).max(100),
  slug: z.string().min(3).max(80),
  baseUrl: z.string().url(),
  category: z.string().max(60).optional(),
  description: z.string().max(150).optional(),
  // ...
});
```

Zod validation errors are caught by the error handler and transformed into
user-friendly messages using FIELD_LABELS (see Section 10).

### 8.7 API Key Format

```typescript
const rawKey = `key_${crypto.randomUUID()}`;
// Example: key_550e8400-e29b-41d4-a716-446655440000
```

- **Prefix `key_`** makes it easy to identify in logs and distinguish from other UUIDs
- **UUID v4** provides 122 bits of randomness (cryptographically secure)
- Stored as a unique indexed column for O(1) lookup in the gateway

### 8.8 Session Management

```
+-------------+     +-----------+     +----------+
| UserSession |     | Login     |     | Refresh  |
| table       |<----| creates   |<----| rotates  |
|             |     | session   |     | token    |
| refreshToken|     +-----------+     +----------+
| (unique idx)|
| expiresAt   |     +-----------+
| revokedAt   |<----| Logout    |
| deviceInfo  |     | sets      |
| ipAddress   |     | revokedAt |
+-------------+     +-----------+
```

- Each login creates a new `UserSession` record with:
  - `refreshToken` (stored as unique string; used for lookup)
  - `expiresAt` = now + 30 days
  - `deviceInfo` (optional, from client)
  - `ipAddress` (from `req.ip`)
- Token refresh **rotates** the refresh token: the old token is replaced, and
  `expiresAt` is reset to 30 days from now
- Logout sets `revokedAt` on the session, immediately invalidating the refresh token
- Validation on refresh checks: exists AND not revoked AND not expired

### 8.9 Firebase Admin (Server-Side Token Verification)

```typescript
// config/firebase.ts
if (config.firebaseServiceAccountKey) {
  // Parse JSON or require file path
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
```

- Firebase Admin SDK is initialized server-side with a service account
- `firebaseAuth.verifyIdToken(idToken)` validates tokens issued by Firebase
  Authentication (Google, GitHub, etc.)
- If Firebase is not configured, a **dummy object** is exported that throws
  descriptive errors, preventing silent failures
- OAuth users who do not have an account are **auto-created** with a random
  password hash (they authenticate exclusively via OAuth)

---

## 9. Background Job Architecture

### 9.1 BullMQ + Redis

All background processing uses **BullMQ**, a Redis-backed job queue library.

```
+-------------------+     +-------------------+     +-------------------+
| email-            |     | subscription-     |     | payment-          |
| notifications     |     | expiry            |     | retry             |
| Queue             |     | Queue             |     | Queue             |
+--------+----------+     +--------+----------+     +--------+----------+
         |                         |                         |
         v                         v                         v
+--------+----------+     +--------+----------+     +--------+----------+
| emailWorker       |     | subscriptionExpiry|     | paymentRetryWorker|
|                   |     | Worker            |     |                   |
| Process:          |     | Process:          |     | Process:          |
| - Send email via  |     | - Find ACTIVE     |     | - Retry failed    |
|   NotificationSvc |     |   subs with       |     |   payment via     |
|                   |     |   endsAt < 7d     |     |   BillingService  |
|                   |     | - Send warning    |     | - On max retries: |
|                   |     |   emails (7d/3d/  |     |   mark invoice    |
|                   |     |   1d before)      |     |   FAILED, sub     |
|                   |     | - Mark expired    |     |   EXPIRED         |
|                   |     |   subs as EXPIRED |     |                   |
+-------------------+     +-------------------+     +-------------------+
```

### 9.2 Three Queues

| Queue Name              | Worker File                          | Purpose                             |
|-------------------------|--------------------------------------|-------------------------------------|
| `email-notifications`   | `src/jobs/email.worker.ts`           | Process email notification payloads |
| `subscription-expiry`   | `src/jobs/subscriptionExpiry.worker.ts` | Check for expiring subscriptions |
| `payment-retry`         | `src/jobs/usageAggregation.worker.ts`| Retry failed Razorpay payments      |

### 9.3 Worker Instantiation

Workers are loaded via dynamic `import()` in `server.ts` after Redis connects:

```typescript
await import("./jobs/email.worker");
await import("./jobs/subscriptionExpiry.worker");
await import("./jobs/usageAggregation.worker");
```

Each worker file creates a `new Worker(queueName, processor, { connection })`
at module scope. The `import()` call triggers module evaluation, which:
1. Duplicates the Redis connection
2. Creates the Queue instance
3. Creates the Worker instance (begins polling Redis for jobs)

### 9.4 Scheduling Strategy

```
server.ts bootstrap()
  |
  +-- setTimeout(schedulePaymentRetries, 120_000)     // 2 min after startup
  +-- setInterval(schedulePaymentRetries, 86_400_000) // Then every 24 hours
  |
  +-- setTimeout(scheduleSubscriptionExpiryChecks, 180_000)  // 3 min after startup
  +-- setInterval(scheduleSubscriptionExpiryChecks, 86_400_000) // Then every 24 hours
```

**Why setTimeout before setInterval?**

The initial delay (2-3 minutes) allows:
- Redis to fully connect and stabilize
- Workers to register and begin processing
- Prevents a burst of jobs immediately at startup

**Environment-based opt-out:**
```typescript
if (process.env.SCHEDULE_PAYMENT_RETRIES !== "false") { ... }
if (process.env.SCHEDULE_SUBSCRIPTION_EXPIRY !== "false") { ... }
```

This allows disabling scheduled jobs in development or when running multiple
instances (only one should schedule).

### 9.5 Job Configuration

```typescript
await paymentRetryQueue.add(
  `retry-${payment.id}`,
  { paymentId: payment.id },
  {
    jobId: `retry-${payment.id}-${Date.now()}`,  // Unique per attempt
    removeOnComplete: true,                       // Clean up Redis memory
    delay: MS.DAY,                                // 24-hour delay
  }
);
```

- **`removeOnComplete: true`** -- jobs are deleted from Redis after successful
  processing, preventing unbounded memory growth
- **`jobId`** includes timestamp to ensure uniqueness across scheduling cycles
- **`delay`** for payment retries ensures at least 24 hours between attempts

### 9.6 Error Handling in Workers

Payment retry worker has specific failure handling:

```
Job fails
  |
  v
Check: retryCount >= maxRetries?
  |
  YES --> Invoice.status = FAILED
  |       Subscription.status = EXPIRED
  |       Log warning
  |
  NO  --> Error re-thrown (BullMQ handles retry)
```

The subscription expiry worker processes all expiring subscriptions in a single
job execution, with individual try/catch per subscription:

```typescript
for (const subscription of expiringSubscriptions) {
  try {
    await notificationService.sendSubscriptionExpiringEmail(...);
  } catch (error) {
    logger.error(`Failed to send expiry warning...`, error);
    // Continues to next subscription
  }
}
```

---

## 10. Error Handling Architecture

### 10.1 Five-Layer Approach

```
Layer 1: Zod Validation
  |
  | Catches malformed input BEFORE business logic
  | Throws ZodError
  |
  v
Layer 2: AppError Throws
  |
  | Business logic throws AppError with status code
  | e.g., AppError("Plan not found", 404)
  |
  v
Layer 3: Prisma Error Mapping
  |
  | Prisma throws PrismaClientKnownRequestError
  | Mapped to HTTP responses by error handler
  |
  v
Layer 4: Express Error Middleware
  |
  | Central errorHandler catches all errors
  | Classifies and returns consistent JSON
  |
  v
Layer 5: Fire-and-Forget
  |
  | Non-critical operations swallow errors
  | Logged but never propagated
```

### Layer 1: Zod Validation

```typescript
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

// In route handler:
const body = registerSchema.parse(req.body);  // Throws ZodError if invalid
```

When a ZodError is thrown, the error handler transforms it using FIELD_LABELS:

```typescript
const FIELD_LABELS: Record<string, string> = {
  name: "API Name",
  slug: "Slug",
  category: "Category",
  description: "Description",
  providerDisplayName: "Provider Display Name",
  rateLimits: "Rate Limits Description",
};
```

**Example transformations:**
```
Input:  "String must contain at most 150 character(s)" for field "description"
Output: "Description must be at most 150 characters."

Input:  "String must contain at least 3 character(s)" for field "name"
Output: "API Name must be at least 3 characters."
```

The `formatZodMessage` function handles:
- Maximum length errors (`at most N character(s)`)
- Minimum length errors (`at least N character(s)`)
- Generic messages (fallback to `Label: message`)
- Unknown fields (auto-capitalize field name)

### Layer 2: AppError

```typescript
export class AppError extends Error {
  public statusCode: number;
  public details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AppError";
  }
}
```

Common usage patterns across the codebase:

| Status | Usage                                              |
|--------|----------------------------------------------------|
| 400    | Invalid business state (e.g., plan has no price)   |
| 401    | Invalid credentials, expired token, invalid API key|
| 403    | Forbidden (wrong role, wrong owner)                |
| 404    | Entity not found                                   |
| 409    | Duplicate (email in use, slug exists)               |
| 429    | Rate limit or quota exceeded                       |
| 500    | External service failure (Razorpay, Firebase)      |
| 502    | Gateway forwarding failed                          |

### Layer 3: Prisma Error Mapping

```typescript
if (err instanceof Prisma.PrismaClientKnownRequestError) {
  if (err.code === "P2002") {
    // Unique constraint violation
    const field = (err.meta?.target as string[])?.[0] || "field";
    const message = `A record with this ${field} already exists.`;
    res.status(409).json({ success: false, message });
    return;
  }
  if (err.code === "P2025") {
    // Record not found (for update/delete operations)
    res.status(404).json({ success: false, message: "Record not found" });
    return;
  }
  // All other Prisma errors
  logger.error("Prisma error occurred", err);
  res.status(500).json({ success: false, message: "Database error occurred" });
  return;
}
```

| Prisma Code | HTTP Status | Meaning                          |
|-------------|-------------|----------------------------------|
| P2002       | 409         | Unique constraint violation      |
| P2025       | 404         | Record not found                 |
| Other       | 500         | Generic database error           |

### Layer 4: Express Error Middleware

The central `errorHandler` function is the **last middleware** registered:

```typescript
export function errorHandler(
  err: Error, req: Request, res: Response, _next: NextFunction
): void {
  // 1. ZodError -> 400 with user-friendly message
  // 2. PrismaClientKnownRequestError -> mapped status
  // 3. AppError -> err.statusCode with err.message
  // 4. Unknown Error -> 500 "Internal Server Error"
}
```

**Consistent response format:**
```json
{
  "success": false,
  "message": "Human-readable error description",
  "details": { /* optional, only for AppError with details */ }
}
```

### Layer 5: Fire-and-Forget

Non-critical operations use `.catch()` to prevent error propagation:

```typescript
// Audit logging - wrapped in try/catch internally
auditLog.log({ userId, action: "PAYMENT_SUCCEEDED", ... });

// Notification emails - .catch() at call site
notificationService.sendPaymentSuccessEmail(...)
  .catch((err) => logger.error("Failed to send payment success email", err));

// Safe notify pattern in ApisService
private safeNotify(action: () => Promise<void>, errorMessage: string): void {
  action().catch((err) => logger.error(errorMessage, err));
}
```

---

## 11. Scaling Considerations

### 11.1 Stateless Express (Horizontal Scaling)

```
                    +----> Express Instance 1 ---+
                    |                             |
 Load Balancer -----+----> Express Instance 2 ---+----> PostgreSQL
                    |                             |
                    +----> Express Instance N ---+----> Redis (shared)
```

The Express application is **fully stateless**:
- No in-memory sessions (sessions are in PostgreSQL)
- No in-process caching
- JWT verification is self-contained (no server-side token store needed)
- Rate limiting state is in Redis (shared)

To scale horizontally, deploy multiple instances behind a load balancer. The
only requirement is that all instances share the same PostgreSQL and Redis.

### 11.2 Redis Shared State

Redis serves as the single point of shared mutable state:
- **Rate limiting sorted sets** -- all instances read/write the same keys
- **BullMQ job queues** -- jobs are distributed across worker instances

Redis itself can be scaled via:
- Redis Sentinel (high availability)
- Redis Cluster (horizontal sharding)

### 11.3 BullMQ Multi-Instance Support

BullMQ natively supports multiple workers processing the same queue. When
running N instances of the application:

- Each instance registers workers for all three queues
- BullMQ's Redis-based locking ensures each job is processed by **exactly one**
  worker (at-least-once delivery with deduplication via `jobId`)
- **Caveat:** The scheduling functions (`schedulePaymentRetries`,
  `scheduleSubscriptionExpiryChecks`) should only run on ONE instance.
  Currently controlled via environment variables:
  ```
  SCHEDULE_PAYMENT_RETRIES=false      # Disable on all but one instance
  SCHEDULE_SUBSCRIPTION_EXPIRY=false  # Disable on all but one instance
  ```

### 11.4 Prisma Connection Pooling

Prisma Client manages a connection pool to PostgreSQL:
- Default pool size: `num_cpus * 2 + 1`
- Configurable via `DATABASE_URL` query parameters:
  ```
  postgresql://...?connection_limit=20&pool_timeout=10
  ```

Additionally, `src/config/db.ts` creates a raw `pg.Pool` for the health check
(`verifyDbConnection`), which has its own independent connection pool.

### 11.5 UsageLog Growth (Needs Archival Strategy)

The `UsageLog` table is **append-only** and grows linearly with API traffic:

```
Estimated growth:
  1,000 API calls/day   -->   30,000 rows/month  -->  ~360,000 rows/year
  10,000 API calls/day  -->  300,000 rows/month  --> ~3,600,000 rows/year
  100,000 API calls/day --> 3,000,000 rows/month --> ~36,000,000 rows/year
```

**Current indexes on UsageLog:**
- `(apiId, timestamp)` -- provider analytics
- `(subscriptionId, timestamp)` -- quota checks (COUNT per month)
- `(userId, timestamp)` -- consumer analytics

**Recommended archival strategy (not yet implemented):**
1. **Partition by month** -- PostgreSQL native table partitioning on `timestamp`
2. **Archive old partitions** -- Move partitions older than 90 days to cold storage
3. **Materialized views** -- Pre-aggregate daily/monthly counts for analytics
4. **TTL-based deletion** -- Drop partitions older than retention period

### 11.6 Bottleneck Analysis

| Component           | Bottleneck Risk  | Mitigation                               |
|---------------------|------------------|------------------------------------------|
| Gateway quota check | HIGH -- COUNT    | Cache monthly count in Redis; increment  |
|                     | query per request| on each request; reset at month start    |
| UsageLog inserts    | MEDIUM -- write  | Batch inserts via BullMQ queue           |
|                     | per API call     | (decouple from request path)             |
| Prisma connections  | MEDIUM -- pool   | Increase pool size, add PgBouncer        |
|                     | exhaustion       |                                          |
| Redis rate limit    | LOW -- sorted    | Redis Cluster for >100K req/sec          |
|                     | set operations   |                                          |
| JWT verification    | LOW -- CPU-bound | HS256 is fast; RS256 would be slower     |
| Analytics queries   | MEDIUM -- full   | Materialized views, time-bucketed        |
|                     | table scans      | pre-aggregation                          |

---

## 12. Config Management

### 12.1 Configuration Loading

```typescript
// src/config/env.ts
import dotenv from "dotenv";
dotenv.config();  // Loads .env file into process.env
```

The `config` object is a typed singleton (`AppConfig` interface) that reads
all environment variables at startup:

```typescript
export interface AppConfig {
  port: number;
  corsOrigin: string;
  databaseUrl: string;
  redisUrl: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  razorpayKeyId: string;
  razorpayKeySecret: string;
  razorpayTestMode: boolean;
  emailEnabled: boolean;
  emailHost: string;
  emailPort: number;
  emailSecure: boolean;
  emailUser: string;
  emailPassword: string;
  emailFrom: string;
  emailFromName: string;
  firebaseServiceAccountKey: string;
}
```

### 12.2 Environment Variable Helpers

Two helper functions enforce the required/optional distinction:

```typescript
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getEnvOrEmpty(name: string): string {
  return process.env[name] || "";
}
```

| Function        | Behavior                              | Used For                          |
|-----------------|---------------------------------------|-----------------------------------|
| `requireEnv()`  | Throws at startup if missing          | DATABASE_URL, REDIS_URL, JWT secrets |
| `getEnvOrEmpty()`| Returns empty string if missing      | Optional configs (email, Razorpay production keys) |

**Fail-fast principle:** Missing mandatory environment variables crash the
application at startup (`bootstrap()` catches the error and calls `process.exit(1)`),
preventing a misconfigured server from serving requests.

### 12.3 Required vs Optional Environment Variables

| Variable                    | Required? | Default               | Notes                              |
|-----------------------------|-----------|-----------------------|------------------------------------|
| `DATABASE_URL`              | YES       | --                    | PostgreSQL connection string       |
| `REDIS_URL`                 | YES       | --                    | Redis connection string            |
| `JWT_ACCESS_SECRET`         | YES       | --                    | HMAC key for access tokens         |
| `JWT_REFRESH_SECRET`        | YES       | --                    | HMAC key for refresh tokens        |
| `RAZORPAY_TEST_KEY_ID`      | YES*      | --                    | Required if test mode              |
| `RAZORPAY_TEST_KEY_SECRET`  | YES*      | --                    | Required if test mode              |
| `RAZORPAY_KEY_ID`           | NO        | Falls back to test key| Production Razorpay key            |
| `RAZORPAY_KEY_SECRET`       | NO        | Falls back to test key| Production Razorpay secret         |
| `RAZORPAY_TEST_MODE`        | NO        | `false`               | `"true"` to use test keys         |
| `PORT`                      | NO        | `4000`                | Express listen port                |
| `CORS_ORIGIN`               | NO        | `"*"`                 | Allowed CORS origin                |
| `NODE_ENV`                  | NO        | --                    | `"production"` for prod checks     |
| `EMAIL_ENABLED`             | NO        | `true`                | `"false"` to disable emails        |
| `EMAIL_HOST`                | NO        | `smtp.gmail.com`      | SMTP host                          |
| `EMAIL_PORT`                | NO        | `587`                 | SMTP port                          |
| `EMAIL_SECURE`              | NO        | `false`               | `"true"` for TLS                   |
| `EMAIL_USER`                | NO        | `""`                  | SMTP username                      |
| `EMAIL_PASSWORD`            | NO        | `""`                  | SMTP password                      |
| `EMAIL_FROM`                | NO        | EMAIL_USER or fallback| Sender email address               |
| `EMAIL_FROM_NAME`           | NO        | `"API Marketplace"`   | Sender display name                |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | NO     | `""`                  | JSON string or file path           |
| `SCHEDULE_PAYMENT_RETRIES`  | NO        | `true`                | `"false"` to disable               |
| `SCHEDULE_SUBSCRIPTION_EXPIRY` | NO     | `true`                | `"false"` to disable               |
| `PROVIDER_COMMISSION_RATE`  | NO        | `0.1` (10%)           | Platform commission rate           |

### 12.4 Razorpay Test/Production Mode Switching

```typescript
razorpayKeyId: process.env.RAZORPAY_TEST_MODE === "true"
  ? requireEnv("RAZORPAY_TEST_KEY_ID")
  : (getEnvOrEmpty("RAZORPAY_KEY_ID") || requireEnv("RAZORPAY_TEST_KEY_ID")),

razorpayKeySecret: process.env.RAZORPAY_TEST_MODE === "true"
  ? requireEnv("RAZORPAY_TEST_KEY_SECRET")
  : (getEnvOrEmpty("RAZORPAY_KEY_SECRET") || requireEnv("RAZORPAY_TEST_KEY_SECRET")),
```

**Resolution logic:**

```
RAZORPAY_TEST_MODE = "true"
  --> Use RAZORPAY_TEST_KEY_ID and RAZORPAY_TEST_KEY_SECRET (required)

RAZORPAY_TEST_MODE = "false" (or unset)
  --> Use RAZORPAY_KEY_ID if provided
  --> Otherwise fall back to RAZORPAY_TEST_KEY_ID (required as fallback)
```

This allows development teams to always have test keys configured while
production deployments provide production keys. The `config.razorpayTestMode`
boolean is also exposed in API responses so the frontend can display
appropriate payment UI (e.g., test mode badge).

The test payment simulation endpoint (`POST /test/payments/:orderId/simulate`)
is additionally gated by:
1. `config.razorpayTestMode` must be `true`
2. `NODE_ENV` must not be `"production"`

---

## Appendix: File Index

```
backend/
  prisma/
    schema.prisma                          # 13 models, 6 enums, all indexes
  src/
    server.ts                              # Bootstrap, middleware, worker init
    routes.ts                              # Route registration (8 routers)
    config/
      env.ts                               # AppConfig, requireEnv, getEnvOrEmpty
      prisma.ts                            # PrismaClient singleton
      redis.ts                             # Redis client singleton
      firebase.ts                          # Firebase Admin initialization
      db.ts                                # pg.Pool for health check
    common/
      logger.ts                            # Console-based logger
      types.ts                             # Shared types (RazorpayPayload, MS, constants)
      middleware/
        errorHandler.ts                    # AppError class + Express error middleware
        requestLogger.ts                   # HTTP request logger
    modules/
      auth/
        auth.routes.ts                     # 9 endpoints (register, login, refresh, etc.)
        auth.service.ts                    # AuthService (JWT, bcrypt, Firebase)
        middleware/
          authenticate.ts                  # authenticateJWT middleware
      apis/
        apis.routes.ts                     # 17 endpoints (CRUD, admin, public)
        apis.service.ts                    # ApisService (create, update, plans, status)
      subscriptions/
        subscriptions.routes.ts            # 11 endpoints (subscribe, keys, usage)
        subscriptions.service.ts           # SubscriptionsService (subscribe, keys, usage)
      billing/
        billing.routes.ts                  # 7 endpoints (order, verify, retry)
        billing.service.ts                 # BillingService (Razorpay integration)
      gateway/
        gateway.routes.ts                  # 2 endpoints (wildcard gateway proxy)
        gateway.service.ts                 # GatewayService (validate, rate limit, forward)
      analytics/
        analytics.routes.ts                # 5 endpoints (provider, consumer, admin)
        analytics.service.ts               # AnalyticsService (revenue, sales, finance)
      notifications/
        notification.service.ts            # NotificationService (currently no-op)
        notifications.routes.ts            # 1 endpoint (test email, returns 410)
      audit/
        audit.service.ts                   # auditLog singleton (fire-and-forget)
        audit.routes.ts                    # 1 endpoint (cursor-paginated list)
      rbac/
        middleware/rbac.ts                 # requireRole, requirePermission
        repositories/role.repository.ts    # RoleRepository (findByName, assign)
    jobs/
      email.queue.ts                       # BullMQ Queue for email-notifications
      email.worker.ts                      # Worker for email-notifications queue
      subscriptionExpiry.worker.ts         # Worker + scheduler for subscription expiry
      usageAggregation.worker.ts           # Worker + scheduler for payment retry
```
