# API Marketplace

A full-stack API marketplace platform where providers can publish, manage, and monetize their APIs, while consumers can discover, subscribe to, and integrate them into their applications through a managed gateway. Built as a modular monolith with TypeScript on both the frontend and backend.

Providers create APIs, set pricing plans, and submit them for platform review. Admins approve and publish APIs. Consumers browse the marketplace, subscribe to plans (free or paid via Razorpay), generate API keys, and call APIs through a rate-limited gateway that tracks usage and enforces quotas.

---

## Tech Stack

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 18+ | Runtime |
| Express | 4.19.2 | REST API framework |
| TypeScript | 5.6.3 | Type safety |
| PostgreSQL | 14+ | Primary database |
| Prisma | 5.20.0 | ORM and migrations |
| Redis | 7+ | Rate limiting, job queues |
| BullMQ | 5.12.7 | Background job processing |
| JWT (jsonwebtoken) | 9.0.2 | Token-based authentication |
| Firebase Admin | 13.6.0 | Google OAuth verification |
| Razorpay | via Axios | Payment processing |
| Zod | 3.23.8 | Request validation |
| Helmet | 7.0.0 | HTTP security headers |
| bcrypt | 5.1.1 | Password hashing |
| Nodemailer | 6.9.8 | Email (currently disabled) |

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js (App Router) | 15.1.7 | React framework with SSR |
| React | 18.3.1 | UI library |
| TypeScript | 5.6.3 | Type safety |
| Tailwind CSS | 3.4.19 | Utility-first styling |
| Firebase | 12.8.0 | Google OAuth (client SDK) |
| Lucide React | 0.562.0 | Icon library |
| react-hot-toast | 2.6.0 | Toast notifications |
| clsx | 2.1.1 | Conditional class names |

### Infrastructure

| Technology | Purpose |
|-----------|---------|
| Docker + Docker Compose | Containerized deployment |
| Nginx | Reverse proxy |
| PostgreSQL | Relational database |
| Redis | In-memory store |

---

## Architecture

```
+---------------------------------------------------------------+
|                        Frontend                                |
|              Next.js 15 (localhost:5173)                       |
|                                                                |
|  +----------+  +----------+  +----------+  +------------+     |
|  |  Public   |  | Consumer |  | Provider |  |   Admin    |     |
|  |  Pages    |  |Dashboard |  |Dashboard |  | Dashboard  |     |
|  +----------+  +----------+  +----------+  +------------+     |
|                         |                                      |
|                    /api/* proxy                                 |
+-------------------------+--------------------------------------+
                          |
+-------------------------+--------------------------------------+
|                     Backend                                    |
|              Express (localhost:4000)                           |
|                                                                |
|  +------+  +----------+  +--------+  +-----------------+      |
|  | Auth |  |   APIs   |  |Billing |  |     Gateway     |      |
|  |      |  |(Provider |  |(Razor- |  |  (Proxy + Rate  |      |
|  | JWT  |  | + Admin) |  |  pay)  |  |    Limiting)    |      |
|  +--+---+  +----------+  +----+---+  +--------+--------+      |
|     |                         |                |               |
|  +--+-----------------------+ |    +-----------+----------+    |
|  |      PostgreSQL          | |    |       Redis          |    |
|  |  (Prisma ORM, 13 models) | |    | (Rate limits, jobs)  |    |
|  +--------------------------+ |    +----------------------+    |
|                               |                                |
|                    +----------+----------+                     |
|                    |   Razorpay API      |                     |
|                    |  (Payment gateway)  |                     |
|                    +---------------------+                     |
+----------------------------------------------------------------+
```

---

## Prerequisites

- **Node.js** >= 18
- **PostgreSQL** >= 14
- **Redis** >= 7
- **Razorpay** test account (for payment processing)
- **Firebase** project (optional, for Google OAuth)

---

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd api-marketplace

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your values:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/api_marketplace
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=<generate with: openssl rand -base64 32>
JWT_REFRESH_SECRET=<generate with: openssl rand -base64 32>
RAZORPAY_TEST_MODE=true
RAZORPAY_TEST_KEY_ID=<from Razorpay dashboard>
RAZORPAY_TEST_KEY_SECRET=<from Razorpay dashboard>
CORS_ORIGIN=http://localhost:5173
```

### 3. Set Up Database

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed initial roles (SuperAdmin + User)
npx prisma db seed
```

### 4. Configure Frontend

```bash
cd frontend
cp .env.example .env
```

Edit `.env` with Firebase credentials (optional for OAuth):

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=<your-key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<your-domain>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<your-project>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<your-bucket>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<your-sender-id>
NEXT_PUBLIC_FIREBASE_APP_ID=<your-app-id>
```

### 5. Start Development Servers

```bash
# Terminal 1: Backend (port 4000)
cd backend
npm run dev

# Terminal 2: Frontend (port 5173)
cd frontend
npm run dev
```

### 6. Verify

- Frontend: http://localhost:5173
- Backend health: http://localhost:4000/health
- Register a new account and explore the platform

---

## Project Structure

```
api-marketplace/
├── backend/                     # Express REST API
│   ├── src/
│   │   ├── server.ts            # App bootstrap, middleware, job scheduling
│   │   ├── routes.ts            # Route registration hub
│   │   ├── config/              # DB, Redis, Firebase, JWT, env config
│   │   ├── common/              # Logger, error handler, request logger
│   │   ├── modules/
│   │   │   ├── auth/            # Authentication & sessions (JWT + OAuth)
│   │   │   ├── apis/            # API lifecycle (provider, admin, public)
│   │   │   ├── subscriptions/   # Subscriptions & API key management
│   │   │   ├── billing/         # Razorpay payments & invoices
│   │   │   ├── gateway/         # Request proxy & rate limiting
│   │   │   ├── analytics/       # Usage & revenue metrics
│   │   │   ├── audit/           # Compliance logging
│   │   │   ├── notifications/   # Email notifications (disabled)
│   │   │   └── rbac/            # Role-based access control
│   │   └── jobs/                # BullMQ workers (email, expiry, retry)
│   ├── prisma/                  # Database schema & migrations
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
├── frontend/                    # Next.js web application
│   ├── app/                     # Routes (Next.js App Router)
│   │   ├── admin/               # Admin dashboard & API moderation
│   │   ├── provider/            # Provider API management
│   │   ├── dashboard/           # Consumer dashboard
│   │   ├── login/ & register/   # Auth pages
│   │   └── apis/                # Public API detail
│   ├── src/
│   │   ├── components/          # UI, layout, page, auth components
│   │   ├── contexts/            # AuthContext, ThemeContext
│   │   ├── services/            # API client (60+ functions)
│   │   └── utils/               # Helpers (firebase, markdown, etc.)
│   ├── .env.example
│   └── package.json
├── docker-compose.yml           # PostgreSQL + Redis + Backend + Nginx
├── nginx.conf                   # Reverse proxy config
└── README.md                    # This file
```

---

## API Endpoints

### Authentication (9 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | None | Create account (email, password, name) |
| POST | `/auth/login` | None | Email/password login |
| POST | `/auth/social` | None | Firebase OAuth login (idToken) |
| POST | `/auth/refresh` | None | Rotate access/refresh tokens |
| POST | `/auth/logout` | None | Revoke refresh token |
| GET | `/auth/me` | JWT | Get current user profile |
| POST | `/auth/select-role` | JWT | Assign User role |
| PATCH | `/auth/profile` | JWT | Update user name |
| PATCH | `/auth/change-password` | JWT | Change password |

### Public APIs (2 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/apis` | None | List LIVE APIs (paginated, searchable) |
| GET | `/apis/:id` | None | Get API details |

### Provider APIs (10 routes) -- Requires `User` role

| Method | Path | Description |
|--------|------|-------------|
| GET | `/provider/apis` | List my APIs |
| POST | `/provider/apis` | Create new API |
| PUT | `/provider/apis/:id` | Update API details |
| GET | `/provider/apis/:id` | Get API by ID |
| GET | `/provider/apis/:id/overview` | Get API stats |
| GET | `/provider/apis/:id/plans` | List pricing plans |
| GET | `/provider/apis/:id/docs` | Get documentation |
| POST | `/provider/apis/:id/plans` | Add pricing plan |
| DELETE | `/provider/apis/plans/:planId` | Delete a plan |
| POST | `/provider/apis/:id/submit-for-review` | Submit for admin review |

### Admin APIs (9 routes) -- Requires `SuperAdmin` role

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/apis` | List all APIs (with status filter) |
| GET | `/admin/apis/:id` | Get API details |
| PATCH | `/admin/apis/:id/status` | Change API status |
| POST | `/admin/apis/:id/status` | Change API status (alt) |
| POST | `/admin/apis/:id/approve` | Approve API |
| POST | `/admin/apis/:id/publish` | Publish (set to LIVE) |
| POST | `/admin/apis/:id/suspend` | Suspend API |
| POST | `/admin/apis/:id/activate` | Reactivate API |
| POST | `/admin/apis/:id/reject` | Reject (back to DRAFT) |

### Subscriptions (12 routes) -- Requires JWT

| Method | Path | Description |
|--------|------|-------------|
| POST | `/subscriptions` | Subscribe to a plan |
| GET | `/subscriptions/me` | List my subscriptions |
| GET | `/subscriptions/me/usage` | Usage statistics |
| GET | `/subscriptions/me/purchases` | Purchase history |
| GET | `/subscriptions/me/usage/detailed` | Detailed usage per subscription |
| DELETE | `/subscriptions/:id` | Cancel subscription |
| POST | `/subscriptions/bulk-delete` | Bulk cancel |
| POST | `/subscriptions/:id/keys` | Create API key |
| GET | `/subscriptions/:id/keys` | List API keys |
| POST | `/subscriptions/:id/keys/:keyId/regenerate` | Regenerate key |
| POST | `/subscriptions/:id/keys/:keyId/revoke` | Revoke key |
| DELETE | `/subscriptions/:id/keys/:keyId` | Delete key |

### Billing (7 routes) -- Requires JWT

| Method | Path | Description |
|--------|------|-------------|
| POST | `/billing/subscriptions/order` | Create Razorpay order |
| POST | `/billing/payments/razorpay/verify` | Verify payment (HMAC) |
| GET | `/billing/invoices` | List user invoices |
| GET | `/billing/payments/:orderId/status` | Get payment status |
| POST | `/billing/payments/:paymentId/retry` | Retry failed payment |
| GET | `/billing/payments/failed/eligible` | List retryable payments |
| POST | `/billing/test/payments/:orderId/simulate` | Simulate (test mode only) |

### Analytics (6 routes) -- Requires JWT

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/analytics/provider/usage` | User | Provider API usage (30 days) |
| GET | `/analytics/consumer/usage` | User | Consumer usage by API |
| GET | `/analytics/provider/revenue` | User | Revenue with commission |
| GET | `/analytics/provider/sales` | User | Sales history |
| GET | `/analytics/admin/overview` | SuperAdmin | Platform overview |
| GET | `/analytics/admin/finance` | SuperAdmin | Finance dashboard |

### Gateway (2 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| ALL | `/gateway/:apiSlug` | API Key | Forward request to API |
| ALL | `/gateway/:apiSlug/*` | API Key | Forward with subpath |

### System (3 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Health check |
| GET | `/` | None | Root message |
| GET | `/audit-logs` | JWT | User audit trail |

---

## Database Schema

13 interconnected models managed by Prisma ORM:

```
User ──────────── UserRole ──────── Role
  |                                  (SuperAdmin, User)
  +── ApiProvider ── Api ── ApiPlan
  |                   |        |
  |                   |    Subscription ── ApiKey
  |                   |        |
  |                   |    Invoice ── Payment
  |                   |
  |                UsageLog
  |
  +── UserSession (refresh tokens)
  +── AuditLog (compliance trail)
```

### Models

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **User** | User accounts | email, passwordHash, name, razorpayCustomerId, isActive |
| **Role** | Role definitions | name (SuperAdmin, User) |
| **UserRole** | User-role junction | userId + roleId (composite PK) |
| **ApiProvider** | Provider profile | userId (1:1 with User), displayName, website |
| **Api** | API definitions | name, slug, baseUrl, status, documentation, rateLimits |
| **ApiPlan** | Pricing tiers | billingType (SUBSCRIPTION/FREE), priceMonthly, monthlyQuota |
| **Subscription** | User-to-API access | status (PENDING/ACTIVE/CANCELLED/EXPIRED), endsAt |
| **ApiKey** | Auth credentials | key (`key_<uuid>`), isActive, revokedAt |
| **UsageLog** | Request tracking | path, method, statusCode, latencyMs, bytesIn/Out |
| **Invoice** | Billing records | amount (paise), currency (INR), status (PENDING/PAID/FAILED/CANCELLED) |
| **Payment** | Transaction log | provider, externalPaymentId, status, retryCount, maxRetries |
| **AuditLog** | Compliance trail | action, entity, entityId, metadata |
| **UserSession** | Token management | refreshToken, deviceInfo, ipAddress, expiresAt |

### Enums

| Enum | Values |
|------|--------|
| ApiStatus | DRAFT, REVIEW, APPROVED, LIVE, SUSPENDED |
| BillingType | SUBSCRIPTION, FREE |
| SubscriptionStatus | PENDING, ACTIVE, CANCELLED, EXPIRED |
| InvoiceStatus | PENDING, PAID, FAILED, CANCELLED |
| InvoiceType | SUBSCRIPTION |
| PaymentStatus | PENDING, SUCCEEDED, FAILED, REFUNDED |

---

## API Lifecycle

```
Provider creates API (DRAFT)
    -> Submits for review (REVIEW)
        -> Admin approves (APPROVED)
            -> Admin publishes (LIVE)
                -> Consumers can subscribe
                    -> Generate API keys
                        -> Call API via gateway

Admin can also:
    -> Suspend a LIVE API (SUSPENDED)
    -> Reactivate a SUSPENDED API (LIVE)
    -> Reject a REVIEW API (back to DRAFT)
```

---

## User Roles

| Role | Access | Description |
|------|--------|-------------|
| **Consumer** (default) | Public pages + Dashboard | Browse, subscribe, use APIs |
| **User** (Provider) | + Provider pages | Create and monetize APIs |
| **SuperAdmin** | + Admin pages | Platform management, API moderation |

### Permission Matrix

| Permission | User | SuperAdmin |
|-----------|------|------------|
| `apis.manage_own` | Yes | Yes (all) |
| `apis.view` | Yes | Yes |
| `subscriptions.manage_self` | Yes | Yes |
| `analytics.provider` | Yes | Yes |
| `analytics.consumer` | Yes | Yes |
| `*` (wildcard) | No | Yes |

---

## Payment Flow (Razorpay)

```
1. Consumer selects paid plan
   -> POST /subscriptions -> Subscription created (PENDING)

2. Frontend creates order
   -> POST /billing/subscriptions/order
   -> Invoice (PENDING) + Payment (PENDING) + Razorpay order created

3. Razorpay checkout opens -> User completes payment

4. Payment verified
   -> POST /billing/payments/razorpay/verify
   -> HMAC-SHA256 signature verification
   -> Payment -> SUCCEEDED, Invoice -> PAID, Subscription -> ACTIVE

5. Consumer generates API keys -> Calls APIs through gateway
```

- **Currency**: INR (amounts stored in paise, e.g. 999 INR = 99900)
- **Test mode**: Available for development (`RAZORPAY_TEST_MODE=true`)
- **Payment retry**: Automatic (3 attempts over 3 days), then Invoice -> FAILED and Subscription -> EXPIRED

---

## Gateway and Rate Limiting

The API gateway proxies consumer requests to target APIs:

```
Consumer Request
    -> Extract X-API-Key header
    -> Validate key (active, subscription ACTIVE, API LIVE)
    -> Check per-minute rate limit (Redis sliding window, 60s)
    -> Check monthly quota (PostgreSQL count)
    -> Forward to target API (baseUrl + path)
    -> Log usage metrics (UsageLog table)
    -> Return response
```

**Rate limiting**: Redis sorted set with sliding window algorithm. Key: `rate:{apiKeyId}:{apiId}`, 60-second window, limit per API's `publicRateLimitPerMinute` field. Violation returns `429 Too Many Requests`.

**Monthly quota**: Count of UsageLog entries per subscription in the current calendar month. `null` quota means unlimited.

---

## Docker Deployment

```bash
# Start all services (PostgreSQL, Redis, Backend, Nginx)
docker-compose up -d

# Initialize database (first time)
docker-compose exec backend npm run prisma:generate
docker-compose exec backend npm run prisma:deploy
docker-compose exec backend npx prisma db seed

# Access
# Backend API: http://localhost:4000
# Nginx proxy: http://localhost:80
# Frontend: run separately (cd frontend && npm run dev)

# Stop
docker-compose down
```

Docker Compose services: PostgreSQL (5432), Redis (6379), Backend (4000), Nginx (80).

---

## Environment Variables

### Backend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `4000` | Server port |
| `NODE_ENV` | No | `development` | Environment mode |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `REDIS_URL` | Yes | - | Redis connection string |
| `JWT_ACCESS_SECRET` | Yes | - | Access token signing key |
| `JWT_REFRESH_SECRET` | Yes | - | Refresh token signing key |
| `CORS_ORIGIN` | No | `*` | Allowed CORS origin |
| `RAZORPAY_TEST_MODE` | No | `true` | Use test or production keys |
| `RAZORPAY_TEST_KEY_ID` | Conditional | - | Razorpay test key ID |
| `RAZORPAY_TEST_KEY_SECRET` | Conditional | - | Razorpay test secret |
| `RAZORPAY_KEY_ID` | Conditional | - | Razorpay production key ID |
| `RAZORPAY_KEY_SECRET` | Conditional | - | Razorpay production secret |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | No | - | Path to Firebase service account JSON |
| `PROVIDER_COMMISSION_RATE` | No | `0.1` | Platform commission (10%) |
| `SCHEDULE_PAYMENT_RETRIES` | No | `true` | Enable payment retry jobs |
| `SCHEDULE_SUBSCRIPTION_EXPIRY` | No | `true` | Enable subscription expiry checks |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | `/api` | API base URL (proxied in dev) |
| `API_PROXY_TARGET` | `http://localhost:4000` | Backend URL for Next.js proxy |
| `NEXT_PUBLIC_GATEWAY_BASE_URL` | - | Gateway URL for API calls |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | - | Firebase Web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | - | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | - | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | - | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | - | Firebase sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | - | Firebase app ID |

---

## Development Scripts

### Backend

```bash
npm run dev              # Hot-reload dev server (ts-node-dev)
npm run build            # Compile TypeScript to dist/
npm run start            # Run production build
npm run prisma:generate  # Regenerate Prisma client
npm run prisma:migrate   # Create migration (dev)
npm run prisma:deploy    # Apply migrations (production)
npm run prisma:seed      # Seed roles (SuperAdmin + User)
npm run lint             # ESLint
```

### Frontend

```bash
npm run dev    # Dev server on port 5173 (hot reload)
npm run build  # Production build
npm run start  # Production server
npm run lint   # ESLint
```

### Useful Commands

```bash
# Reset database (development only)
cd backend && npx prisma migrate reset

# View database in browser
cd backend && npx prisma studio

# Generate types after schema change
cd backend && npx prisma generate
```

---

## Production Deployment

### Backend

```bash
cd backend
npm run build
npx prisma migrate deploy
NODE_ENV=production npm start
```

### Frontend

```bash
cd frontend
npm run build
npm start
```

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong, unique JWT secrets (`openssl rand -base64 32`)
- [ ] Set `CORS_ORIGIN` to frontend domain
- [ ] Set `RAZORPAY_TEST_MODE=false` with production Razorpay keys
- [ ] Configure `FIREBASE_SERVICE_ACCOUNT_KEY` for OAuth
- [ ] Ensure PostgreSQL and Redis are accessible and secured
- [ ] Set up process manager (PM2, systemd, or Docker)
- [ ] Set `NEXT_PUBLIC_API_BASE_URL` to production backend URL
- [ ] Configure all `NEXT_PUBLIC_FIREBASE_*` variables
- [ ] Run `npm run build` in frontend and verify zero errors
- [ ] Enable HTTPS/TLS for all endpoints

---

## Documentation

| Document | Description |
|----------|-------------|
| [Backend Documentation](backend/BACKEND_DOCUMENTATION.md) | API reference, database models, auth, billing, gateway |
| [Backend Architecture](backend/ARCHITECTURE.md) | Design patterns, data flows, security, scaling |
| [Frontend Documentation](frontend/FRONTEND_DOCUMENTATION.md) | Routes, components, state management, design system |
| [Prisma Schema](backend/prisma/schema.prisma) | Complete database model definitions |

---

## License

Private project. All rights reserved.
