# API Marketplace Frontend -- Complete Documentation

---

## 1. Tech Stack

| Technology       | Version   | Purpose                                      |
|------------------|-----------|----------------------------------------------|
| Next.js          | ^15.1.7   | React framework with App Router, SSR, API proxy via rewrites |
| React            | ^18.3.1   | UI library                                   |
| React DOM        | ^18.3.1   | React DOM renderer                           |
| TypeScript       | ^5.6.3    | Static type checking                         |
| Tailwind CSS     | ^3.4.19   | Utility-first CSS framework                  |
| Firebase         | ^12.8.0   | Google OAuth (signInWithPopup)               |
| lucide-react     | ^0.562.0  | SVG icon library                             |
| clsx             | ^2.1.1    | Conditional className utility                |
| react-hot-toast  | ^2.6.0    | Toast notifications                          |
| PostCSS          | ^8.5.6    | CSS processing pipeline                      |
| Autoprefixer     | ^10.4.23  | Vendor prefix automation                     |
| ESLint           | ^8.57.0   | Linting (eslint-config-next ^15.1.7, eslint-config-prettier ^9.1.0) |

---

## 2. Directory Structure

```
frontend/
|-- app/                            # Next.js App Router (route definitions)
|   |-- globals.css                 # Global CSS: design tokens, component classes, utilities
|   |-- layout.tsx                  # Root layout: <html>, Inter font, Providers wrapper, Razorpay script
|   |-- providers.tsx               # Client-side providers: ThemeProvider > AuthProvider > Toaster
|   |-- page.tsx                    # / route -> ApiListPage (homepage, public)
|   |-- error.tsx                   # Route-level error boundary (try-again UI)
|   |-- global-error.tsx            # Root-level error boundary (inline styles, no Tailwind)
|   |-- not-found.tsx               # 404 page with Go Home / Browse APIs links
|   |
|   |-- login/
|   |   |-- page.tsx                # /login -> LoginPage with redirect support via ?redirect=
|   |-- register/
|   |   |-- page.tsx                # /register -> RegisterPage with redirect support
|   |-- select-role/
|   |   |-- page.tsx                # /select-role -> redirects to / (legacy stub)
|   |
|   |-- dashboard/
|   |   |-- page.tsx                # /dashboard -> DashboardPage (RequireAuth)
|   |-- apis/
|   |   |-- page.tsx                # /apis -> redirects to / (alias)
|   |   |-- [id]/
|   |       |-- page.tsx            # /apis/:id -> ApiDetailPage (public, auth optional)
|   |-- invoices/
|   |   |-- page.tsx                # /invoices -> InvoicesPage (RequireAuth)
|   |-- activity/
|   |   |-- page.tsx                # /activity -> ActivityPage (RequireAuth)
|   |-- profile/
|   |   |-- page.tsx                # /profile -> ProfilePage (RequireAuth)
|   |
|   |-- provider/
|   |   |-- dashboard/
|   |   |   |-- page.tsx            # /provider/dashboard -> ProviderDashboardPage (RequireRole: User, SuperAdmin)
|   |   |-- apis/
|   |       |-- create/
|   |       |   |-- page.tsx        # /provider/apis/create -> CreateApiPage (RequireRole)
|   |       |-- edit/
|   |       |   |-- [id]/
|   |       |       |-- page.tsx    # /provider/apis/edit/:id -> EditApiPage (RequireRole)
|   |       |-- view/
|   |       |   |-- [id]/
|   |       |       |-- page.tsx    # /provider/apis/view/:id -> redirects to overview
|   |       |-- [id]/
|   |           |-- layout.tsx      # Provider API workspace layout (loads API, shows Header/Footer/ProviderApiLayout)
|   |           |-- page.tsx        # /provider/apis/:id -> redirects to overview
|   |           |-- overview/
|   |           |   |-- page.tsx    # /provider/apis/:id/overview -> ProviderApiViewPage (RequireRole)
|   |           |-- documentation/
|   |               |-- page.tsx    # /provider/apis/:id/documentation -> DocumentationEditorPage (RequireRole)
|   |
|   |-- admin/
|       |-- layout.tsx              # Admin layout (passthrough fragment)
|       |-- dashboard/
|       |   |-- page.tsx            # /admin/dashboard -> AdminDashboardPage (RequireRole: SuperAdmin)
|       |-- apis/
|           |-- page.tsx            # /admin/apis -> Admin API moderation list (RequireRole: SuperAdmin)
|           |-- [id]/
|               |-- page.tsx        # /admin/apis/:id -> redirects to overview
|               |-- overview/
|                   |-- page.tsx    # /admin/apis/:id/overview -> AdminApiDetailPage (RequireRole: SuperAdmin)
|
|-- src/                            # Application source code
|   |-- contexts/
|   |   |-- AuthContext.tsx          # Authentication state (user, loading, setUser, refresh, logout)
|   |   |-- ThemeContext.tsx         # Theme state (light/dark toggle, localStorage persistence)
|   |
|   |-- services/
|   |   |-- api.ts                  # API service layer: request<T>(), 60+ exported functions, TypeScript interfaces
|   |
|   |-- components/
|   |   |-- auth/
|   |   |   |-- FullScreenLoader.tsx # Full-screen centered spinner with optional message
|   |   |   |-- RequireAuth.tsx      # Auth guard: redirects to /login if not authenticated
|   |   |   |-- RequireRole.tsx      # Role guard: checks user.roles against allowed roles array
|   |   |
|   |   |-- ui/
|   |   |   |-- Badge.tsx            # Status badge (primary, success, warning, danger, neutral)
|   |   |   |-- Button.tsx           # Button with variants, sizes, loading state, left/right icons
|   |   |   |-- Card.tsx             # Card container (default, hover, interactive) with padding options
|   |   |   |-- ConfirmModal.tsx     # Confirmation dialog (danger, warning, primary) built on Modal
|   |   |   |-- Input.tsx            # Form input with label, error, helper text, left/right icons
|   |   |   |-- Modal.tsx            # Accessible modal with focus trap, Escape close, backdrop blur
|   |   |   |-- Skeleton.tsx         # Skeleton loader (text, circular, rectangular) + SkeletonCard, SkeletonList, SkeletonStats
|   |   |   |-- Spinner.tsx          # Spinning loader (sm, md, lg) with aria-label
|   |   |   |-- ThemeToggle.tsx      # Sun/Moon toggle button for dark mode
|   |   |
|   |   |-- layout/
|   |   |   |-- Header.tsx           # Sticky header: logo, desktop nav, profile dropdown, mobile hamburger menu
|   |   |   |-- Footer.tsx           # Footer with brand, Platform links, Account links, copyright
|   |   |   |-- PageContainer.tsx    # <main> wrapper with container-custom and vertical padding
|   |   |   |-- ProviderApiLayout.tsx# Provider API workspace layout: API name badge, status, tab navigation
|   |   |
|   |   |-- pages/
|   |   |   |-- LoginPage.tsx        # Email/password login + Google OAuth via Firebase
|   |   |   |-- RegisterPage.tsx     # Email/password registration + Google OAuth via Firebase
|   |   |   |-- ApiListPage.tsx      # Public API marketplace grid with search and pagination
|   |   |   |-- ApiDetailPage.tsx    # API detail with Overview/Pricing/Docs tabs, Razorpay checkout
|   |   |   |-- DashboardPage.tsx    # Consumer dashboard: active subscriptions, API key management, invoices
|   |   |   |-- InvoicesPage.tsx     # Full invoice history list
|   |   |   |-- ProfilePage.tsx      # Account settings: edit name, change password
|   |   |   |-- ActivityPage.tsx     # Audit log timeline with cursor-based pagination
|   |   |   |-- ProviderDashboardPage.tsx # Provider dashboard: my APIs list, revenue summary
|   |   |   |-- CreateApiPage.tsx    # Multi-step API creation form with plan setup and markdown editor
|   |   |   |-- EditApiPage.tsx      # Edit existing API settings, manage plans
|   |   |   |-- ProviderApiViewPage.tsx  # Provider API overview: status, metadata, submit for review
|   |   |   |-- DocumentationEditorPage.tsx # Markdown documentation editor with live preview
|   |   |   |-- AdminApiDetailPage.tsx   # Admin API detail: view metadata, approve/reject/publish/suspend
|   |   |
|   |   |-- MarkdownEditor.tsx      # Rich markdown editor with toolbar (bold, italic, headings, code, tables, links) + preview
|   |
|   |-- utils/
|       |-- cn.ts                   # className merger using clsx
|       |-- firebase.ts             # Firebase app initialization, GoogleAuthProvider export
|       |-- format.ts               # Currency formatting: paiseToRupees, formatINR, formatPlanPrice, formatPercent
|       |-- gatewayUrl.ts           # Gateway URL builder: buildGatewayPath, getGatewayBaseUrl, buildGatewayUrl
|       |-- markdown.tsx            # Custom markdown-to-React renderer (headers, lists, tables, code blocks, inline formatting)
|
|-- next.config.ts                  # Next.js config: reactStrictMode, /api/* -> backend proxy rewrites
|-- tailwind.config.js              # Tailwind config: custom colors, animations, fonts, breakpoints
|-- tsconfig.json                   # TypeScript config: strict mode, ESNext, @/* path alias -> src/*
|-- postcss.config.js               # PostCSS: tailwindcss + autoprefixer plugins
|-- package.json                    # Dependencies and npm scripts
```

---

## 3. App Router Routes

### Public Routes (No Authentication Required)

| Path             | Page Component    | Auth Required | Role Required | Description                         |
|------------------|-------------------|:------------:|:-------------:|-------------------------------------|
| `/`              | `ApiListPage`     | No           | --            | API marketplace listing (homepage)  |
| `/apis`          | _(redirect to /)_ | No           | --            | Alias, redirects to homepage        |
| `/apis/:id`      | `ApiDetailPage`   | No           | --            | API detail (overview, pricing, docs). Auth optional for subscribing. |
| `/login`         | `LoginPage`       | No           | --            | Email/password + Google OAuth login. Supports `?redirect=` query param. |
| `/register`      | `RegisterPage`    | No           | --            | Email/password + Google OAuth signup. Supports `?redirect=` query param. |
| `/select-role`   | _(redirect to /)_ | No           | --            | Legacy stub, immediately redirects to `/` |

### Consumer Routes (Authenticated User)

| Path             | Page Component     | Auth Required | Role Required | Description                          |
|------------------|--------------------|:------------:|:-------------:|--------------------------------------|
| `/dashboard`     | `DashboardPage`    | Yes          | Any           | Active subscriptions, API key management, recent invoices |
| `/invoices`      | `InvoicesPage`     | Yes          | Any           | Full billing/invoice history         |
| `/activity`      | `ActivityPage`     | Yes          | Any           | Audit log / account activity timeline|
| `/profile`       | `ProfilePage`      | Yes          | Any           | Edit name, change password           |

### Provider Routes (Role: User or SuperAdmin)

| Path                                | Page Component              | Auth Required | Role Required       | Description                          |
|-------------------------------------|-----------------------------|:------------:|:-------------------:|--------------------------------------|
| `/provider/dashboard`               | `ProviderDashboardPage`     | Yes          | User, SuperAdmin    | My APIs list, revenue summary        |
| `/provider/apis/create`             | `CreateApiPage`             | Yes          | User, SuperAdmin    | Create new API with plan setup       |
| `/provider/apis/edit/:id`           | `EditApiPage`               | Yes          | User, SuperAdmin    | Edit API settings, manage plans      |
| `/provider/apis/view/:id`           | _(redirect to overview)_    | Yes          | User, SuperAdmin    | Redirects to `/provider/apis/:id/overview` |
| `/provider/apis/:id`                | _(redirect to overview)_    | Yes          | User, SuperAdmin    | Redirects to `/provider/apis/:id/overview` |
| `/provider/apis/:id/overview`       | `ProviderApiViewPage`       | Yes          | User, SuperAdmin    | API overview, submit for review      |
| `/provider/apis/:id/documentation`  | `DocumentationEditorPage`   | Yes          | User, SuperAdmin    | Markdown documentation editor        |

The `/provider/apis/:id/*` routes share a layout (`ProviderApiWorkspaceLayout`) that loads the API data and wraps child pages with `Header`, `ProviderApiLayout`, and `Footer`.

### Admin Routes (Role: SuperAdmin)

| Path                          | Page Component         | Auth Required | Role Required | Description                             |
|-------------------------------|------------------------|:------------:|:-------------:|-----------------------------------------|
| `/admin/dashboard`            | `AdminDashboardPage`   | Yes          | SuperAdmin    | Platform overview: stats, revenue, APIs pending review |
| `/admin/apis`                 | `AdminApisPage`        | Yes          | SuperAdmin    | API moderation list: filter by status, change status, search |
| `/admin/apis/:id`             | _(redirect to overview)_ | Yes        | SuperAdmin    | Redirects to `/admin/apis/:id/overview` |
| `/admin/apis/:id/overview`    | `AdminApiDetailPage`   | Yes          | SuperAdmin    | API detail with approve/reject/publish/suspend actions |

### Error Routes

| Path             | Component          | Description                              |
|------------------|--------------------|------------------------------------------|
| _(any invalid)_  | `not-found.tsx`    | 404 page with Go Home and Browse APIs links |
| _(runtime error)_| `error.tsx`        | Route-level error boundary with Try Again button |
| _(critical)_     | `global-error.tsx` | Root error boundary using inline styles (no Tailwind) |

---

## 4. Authentication Flows

### 4.1 Email/Password Login

```
1. User fills email + password in LoginPage form
2. Form onSubmit calls api.login(email, password)
3. api.login() -> request<AuthResponse>("/auth/login", { method: "POST", body: { email, password } })
4. Backend returns { accessToken, refreshToken, user: { id, email, name, roles } }
5. api.login() calls setTokens(accessToken, refreshToken) -> stores in localStorage
6. api.login() extracts roles (handles both string[] and { role: { name } }[] formats)
7. Returns { id, email, name, roles } to LoginPage
8. LoginPage calls onLogin(user) -> AuthContext.setUser(user)
9. Router navigates to redirect path or "/"
10. Toast: "Welcome back!"
```

### 4.2 Email/Password Registration

```
1. User fills name, email, password in RegisterPage form
2. Form onSubmit calls api.register(email, password, name)
3. api.register() -> request<AuthResponse>("/auth/register", { method: "POST", body: { email, password, name } })
4. Backend returns { accessToken, refreshToken, user }
5. Tokens stored in localStorage via setTokens()
6. Returns normalized user to RegisterPage
7. RegisterPage calls onRegister(user) -> AuthContext.setUser(user)
8. Router navigates to redirect path or "/"
9. Toast: "Account created successfully!"
```

### 4.3 Google OAuth Login

```
1. User clicks "Sign in with Google" button
2. LoginPage/RegisterPage calls handleSocialLogin(googleProvider)
3. Firebase signInWithPopup(auth, googleProvider) opens Google OAuth popup
4. On success, result.user.getIdToken() retrieves the Firebase ID token
5. api.socialLogin(idToken) -> request<AuthResponse>("/auth/social", { method: "POST", body: { idToken } })
6. Backend verifies Firebase token, creates/finds user, returns { accessToken, refreshToken, user }
7. Tokens stored in localStorage via setTokens()
8. Returns normalized user -> AuthContext.setUser(user)
9. Router navigates to redirect path or "/"
10. Toast: "Welcome!"
```

Error handling for OAuth includes special handling for `auth/account-exists-with-different-credential`, which indicates the email is already registered with a different sign-in method.

### 4.4 Token Refresh (Automatic)

```
1. Any API call via request<T>() receives a 401 Unauthorized response
2. Guard: retry=true AND path is not "/auth/refresh" or "/auth/login"
3. Check isRefreshing flag:
   a. If already refreshing: await the existing refreshPromise
   b. If not refreshing: set isRefreshing=true, call tryRefreshToken()
4. tryRefreshToken():
   a. Get refreshToken from localStorage
   b. POST /auth/refresh with { refreshToken }
   c. On success: setTokens(new accessToken, new refreshToken), return true
   d. On failure: call logout(), return false
5. If refresh succeeded: retry the original request with retry=false (prevents infinite loops)
6. If refresh failed: user is logged out
7. Reset isRefreshing=false and refreshPromise=null after completion
```

The `isRefreshing` flag and shared `refreshPromise` ensure that concurrent 401 responses share a single refresh attempt rather than triggering multiple refresh requests.

### 4.5 Logout

```
1. User clicks Logout in Header dropdown or mobile menu
2. Header.handleLogout() calls api.logout()
3. api.logout():
   a. Reads refreshToken and accessToken from localStorage
   b. Immediately clears both tokens from localStorage (UI updates fast)
   c. Fire-and-forget: POST /auth/logout with { refreshToken } and Bearer token
   d. .catch(() => {}) -- errors are silently ignored
4. Header calls onLogout() callback if provided
5. In AuthContext.logout(): calls apiLogout(), then sets user = null
6. Router navigates to /login
```

### 4.6 Session Bootstrap (App Start)

```
1. AuthProvider mounts -> calls refresh()
2. refresh() sets loading=true
3. Calls api.getCurrentUser() which:
   a. Checks for accessToken in localStorage
   b. If no token: throws "No token" -> user stays null
   c. If token exists: GET /auth/me with Bearer token
   d. Returns { id, email, name, roles }
4. On success: setUser(user)
5. On failure: setUser(null)
6. Sets loading=false
```

During `loading=true`, auth guards (`RequireAuth`, `RequireRole`) render `FullScreenLoader`.

---

## 5. State Management

### 5.1 AuthContext

**File:** `src/contexts/AuthContext.tsx`

**Interface:**

```typescript
interface AuthUser {
  id: string;
  email: string;
  name?: string;
  roles: string[];
}

type AuthContextValue = {
  user: AuthUser | null;      // Current authenticated user, or null
  loading: boolean;           // True during initial session bootstrap
  setUser: (user: AuthUser | null) => void;  // Directly update user state
  refresh: () => Promise<void>;              // Re-fetch user from /auth/me
  logout: () => void;                        // Clear tokens + set user to null
};
```

**Provider pattern:**

- `AuthProvider` wraps the entire application (inside `ThemeProvider`)
- Uses `useState` for `user` and `loading`
- On mount, calls `refresh()` to bootstrap session from stored tokens
- `value` is memoized with `useMemo` to prevent unnecessary re-renders
- `useAuth()` hook throws if used outside `AuthProvider`

**Roles:** The application uses two main roles:
- `User` -- Standard authenticated user (can also act as Provider)
- `SuperAdmin` -- Administrative access

### 5.2 ThemeContext

**File:** `src/contexts/ThemeContext.tsx`

**Interface:**

```typescript
type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;                    // Current active theme
  toggleTheme: () => void;         // Toggle between light and dark
  setTheme: (theme: Theme) => void; // Set specific theme
}
```

**Provider pattern:**

- `ThemeProvider` wraps `AuthProvider` (outermost context)
- Initial state is `'light'` (fixed for SSR hydration match)
- On mount (useEffect), reads from `localStorage.getItem('theme')`
  - If stored value is 'light' or 'dark': use that
  - Otherwise: check `window.matchMedia('(prefers-color-scheme: dark)')` as fallback
- When `theme` changes (useEffect):
  - Removes both `'light'` and `'dark'` classes from `<html>`
  - Adds the current theme class
  - Stores in `localStorage.setItem('theme', theme)`
- `useTheme()` hook throws if used outside `ThemeProvider`

### 5.3 Provider Hierarchy

```
<ThemeProvider>
  <AuthProvider>
    {children}
    <Toaster position="top-right" duration={3000} />
  </AuthProvider>
</ThemeProvider>
```

The `Providers` component (`app/providers.tsx`) assembles this hierarchy as a `"use client"` boundary, keeping the root layout as a Server Component.

---

## 6. API Service Layer

**File:** `src/services/api.ts`

### 6.1 Core Architecture: `request<T>()`

```typescript
async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T>
```

**Behavior:**

1. **Base URL:** Uses `NEXT_PUBLIC_API_BASE_URL` env var, defaults to `"/api"`
2. **Headers:** Always sets `Content-Type: application/json`. If an access token exists in `localStorage`, adds `Authorization: Bearer <token>`
3. **Fetch:** Calls `fetch(BASE_URL + path, { ...options, headers })`
4. **401 Handling:** If response is 401 and `retry=true` and path is not `/auth/refresh` or `/auth/login`:
   - Uses `isRefreshing` flag and shared `refreshPromise` for concurrency control
   - Attempts token refresh via `tryRefreshToken()`
   - On success: retries the original request with `retry=false`
   - On failure: user is logged out
5. **Error Handling:** If response is not ok, attempts to parse JSON error body for `message` field, falls back to status text. Throws an `Error` with a `status` property attached.
6. **Success:** Returns `res.json()` cast as `Promise<T>`

### 6.2 Token Management Functions (Internal)

```typescript
function getToken(): string | null          // localStorage.getItem("accessToken")
function getRefreshToken(): string | null   // localStorage.getItem("refreshToken")
function setTokens(accessToken: string, refreshToken: string): void
async function tryRefreshToken(): Promise<boolean>  // POST /auth/refresh
```

### 6.3 Exported Functions by Domain

#### Authentication

| Function | Signature | HTTP | Endpoint |
|----------|-----------|------|----------|
| `login` | `(email: string, password: string) => Promise<{id, email, name?, roles}>` | POST | `/auth/login` |
| `register` | `(email: string, password: string, name?: string) => Promise<{id, email, name?, roles}>` | POST | `/auth/register` |
| `socialLogin` | `(idToken: string) => Promise<{id, email, name?, roles}>` | POST | `/auth/social` |
| `getCurrentUser` | `() => Promise<{id, email, name?, roles}>` | GET | `/auth/me` |
| `selectRole` | `(role: string) => Promise<{id, email, roles}>` | POST | `/auth/select-role` |
| `logout` | `() => void` | POST | `/auth/logout` (fire-and-forget) |
| `updateProfile` | `(data: { name?: string }) => Promise<UserProfile>` | PATCH | `/auth/profile` |
| `changePassword` | `(data: ChangePasswordInput) => Promise<void>` | PATCH | `/auth/change-password` |

#### APIs (Public)

| Function | Signature | HTTP | Endpoint |
|----------|-----------|------|----------|
| `fetchApis` | `(params?: { search?, page?, limit? }) => Promise<{ apis, total, pagination }>` | GET | `/apis` |
| `fetchApiById` | `(id: string) => Promise<ApiDetail>` | GET | `/apis/:id` |

**Constant:** `API_PAGE_SIZE = 12`

#### Subscriptions

| Function | Signature | HTTP | Endpoint |
|----------|-----------|------|----------|
| `subscribeToPlan` | `(apiPlanId: string) => Promise<Subscription>` | POST | `/subscriptions` |
| `listMySubscriptions` | `() => Promise<Subscription[]>` | GET | `/subscriptions/me` |
| `deleteSubscription` | `(subscriptionId: string) => Promise<{success, deleted, subscriptionId}>` | DELETE | `/subscriptions/:id` |
| `bulkDeleteSubscriptions` | `(subscriptionIds: string[]) => Promise<{success, deleted, count}>` | POST | `/subscriptions/bulk-delete` |

#### API Keys

| Function | Signature | HTTP | Endpoint |
|----------|-----------|------|----------|
| `createApiKey` | `(subscriptionId: string, label?: string) => Promise<ApiKeyRecord>` | POST | `/subscriptions/:id/keys` |
| `listKeys` | `(subscriptionId: string) => Promise<ApiKeyRecord[]>` | GET | `/subscriptions/:id/keys` |
| `regenerateApiKey` | `(subscriptionId: string, keyId: string) => Promise<ApiKeyRecord>` | POST | `/subscriptions/:id/keys/:keyId/regenerate` |
| `revokeApiKey` | `(subscriptionId: string, keyId: string) => Promise<ApiKeyRecord>` | POST | `/subscriptions/:id/keys/:keyId/revoke` |
| `deleteApiKey` | `(subscriptionId: string, keyId: string) => Promise<{success, deleted, keyId}>` | DELETE | `/subscriptions/:id/keys/:keyId` |

#### Billing

| Function | Signature | HTTP | Endpoint |
|----------|-----------|------|----------|
| `createSubscriptionOrder` | `(subscriptionId: string) => Promise<{invoice, payment, razorpayOrder, razorpayKeyId?, paymentUrl, testMode?}>` | POST | `/billing/subscriptions/order` |
| `listMyInvoices` | `(limit?: number) => Promise<Invoice[]>` | GET | `/billing/invoices` |
| `getPaymentStatus` | `(orderId: string) => Promise<PaymentRecord>` | GET | `/billing/payments/:id/status` |
| `verifyRazorpayCheckoutPayment` | `(input: {razorpay_order_id, razorpay_payment_id, razorpay_signature}) => Promise<{payment, invoice}>` | POST | `/billing/payments/razorpay/verify` |
| `simulateTestPayment` | `(orderId: string, success?: boolean) => Promise<{payment, simulated}>` | POST | `/billing/test/payments/:id/simulate` |

#### Refunds

| Function | Signature | HTTP | Endpoint |
|----------|-----------|------|----------|
| `requestRefund` | `(paymentId: string, amount?: number, reason?: string) => Promise<Record<string, unknown>>` | POST | `/billing/payments/:id/refund` |
| `getRefundStatus` | `(refundId: string) => Promise<Record<string, unknown>>` | GET | `/billing/refunds/:id` |
| `listRefundsForPayment` | `(paymentId: string) => Promise<Record<string, unknown>[]>` | GET | `/billing/payments/:id/refunds` |

#### Provider APIs

| Function | Signature | HTTP | Endpoint |
|----------|-----------|------|----------|
| `getMyApis` | `() => Promise<ApiListItem[]>` | GET | `/provider/apis` |
| `createApi` | `(apiData: {...}) => Promise<ApiDetail>` | POST | `/provider/apis` |
| `updateApi` | `(apiId: string, apiData: {...}) => Promise<ApiDetail>` | PUT | `/provider/apis/:id` |
| `addApiVersion` | `(apiId: string, version: string, specUrl?, specJson?) => Promise<Record<string, unknown>>` | POST | `/provider/apis/:id/versions` |
| `addApiPlan` | `(apiId: string, planData: {...}) => Promise<ApiPlan>` | POST | `/provider/apis/:id/plans` |
| `deleteApiPlan` | `(planId: string) => Promise<{success, message?}>` | DELETE | `/provider/apis/plans/:id` |
| `submitApiForReview` | `(apiId: string) => Promise<ApiDetail>` | POST | `/provider/apis/:id/submit-for-review` |
| `fetchProviderApiById` | `(id: string) => Promise<ApiDetail>` | GET | `/provider/apis/:id` |
| `fetchProviderApiOverview` | `(id: string) => Promise<ApiDetail>` | GET | `/provider/apis/:id/overview` |
| `fetchProviderApiPlans` | `(id: string) => Promise<ApiDetail>` | GET | `/provider/apis/:id/plans` |
| `fetchProviderApiDocs` | `(id: string) => Promise<ApiDetail>` | GET | `/provider/apis/:id/docs` |

#### Admin APIs

| Function | Signature | HTTP | Endpoint |
|----------|-----------|------|----------|
| `getAdminApis` | `(status?: string) => Promise<ApiListItem[]>` | GET | `/admin/apis` |
| `getAdminApiById` | `(apiId: string) => Promise<ApiDetail>` | GET | `/admin/apis/:id` |
| `approveApi` | `(apiId: string) => Promise<ApiDetail>` | POST | `/admin/apis/:id/approve` |
| `publishApi` | `(apiId: string) => Promise<ApiDetail>` | POST | `/admin/apis/:id/publish` |
| `suspendApi` | `(apiId: string) => Promise<ApiDetail>` | POST | `/admin/apis/:id/suspend` |
| `activateApi` | `(apiId: string) => Promise<ApiDetail>` | POST | `/admin/apis/:id/activate` |
| `rejectApi` | `(apiId: string) => Promise<ApiDetail>` | POST | `/admin/apis/:id/reject` |
| `changeApiStatus` | `(apiId: string, status: "DRAFT"|"REVIEW"|"APPROVED"|"LIVE"|"SUSPENDED") => Promise<ApiDetail>` | POST | `/admin/apis/:id/status` |

#### Analytics

| Function | Signature | HTTP | Endpoint |
|----------|-----------|------|----------|
| `fetchConsumerUsage` | `() => Promise<UsageDataPoint[]>` | GET | `/analytics/consumer/usage` |
| `getDetailedUsageStats` | `() => Promise<DetailedUsageStat[]>` | GET | `/subscriptions/me/usage/detailed` |
| `getProviderRevenue` | `(params?: {providerId?, startDate?, endDate?, groupBy?}) => Promise<ProviderRevenueStats>` | GET | `/analytics/provider/revenue` |
| `getProviderUsage` | `() => Promise<UsageDataPoint[]>` | GET | `/analytics/provider/usage` |
| `getProviderSales` | `(params?: {providerId?, startDate?, endDate?}) => Promise<SaleRecord[]>` | GET | `/analytics/provider/sales` |
| `getPurchaseHistory` | `() => Promise<PurchaseRecord[]>` | GET | `/subscriptions/me/purchases` |
| `getAdminOverview` | `() => Promise<AdminOverview>` | GET | `/analytics/admin/overview` |
| `getAdminFinance` | `() => Promise<AdminFinanceData>` | GET | `/analytics/admin/finance` |

#### Audit Logs

| Function | Signature | HTTP | Endpoint |
|----------|-----------|------|----------|
| `getAuditLogs` | `(params?: { limit?, cursor? }) => Promise<{ logs, nextCursor, hasMore }>` | GET | `/audit-logs` |

### 6.4 TypeScript Interfaces

```typescript
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

interface ApisPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface ApiPlan {
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

interface ApiListItem {
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

interface ApiDetail extends ApiListItem {
  documentation?: string | null;
  authenticationMethod?: string | null;
  rateLimits?: string | null;
  codeExamples?: string | null;
  provider?: { id: string; displayName: string } | null;
}

interface Subscription {
  id: string;
  userId: string;
  apiPlanId: string;
  status: "PENDING" | "ACTIVE" | "CANCELLED" | "EXPIRED";
  startedAt: string | null;
  endsAt: string | null;
  apiPlan: ApiPlan & { api: { id: string; name: string; slug: string } };
  keys?: ApiKeyRecord[];
}

interface ApiKeyRecord {
  id: string;
  key: string;
  label?: string | null;
  isActive: boolean;
  revokedAt?: string | null;
  createdAt: string;
}

interface Invoice {
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

interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  externalPaymentId: string;
  createdAt: string;
}

interface UsageDataPoint {
  apiId: string;
  _count: { _all: number };
}

interface DetailedUsageStat {
  subscriptionId: string;
  apiName: string;
  planName: string;
  totalRequests: number;
  monthlyQuota: number | null;
  usagePercent: number | null;
}

interface ProviderRevenueStats {
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

interface SaleRecord {
  subscriptionId: string;
  subscribedAt: string | null;
  status: string;
  customer: { id: string; email: string; name: string | null };
  api: { id: string; name: string; slug: string };
  plan: { id: string; name: string; billingType: string; priceMonthly: number | null; freeTier: boolean };
  payment: { amount: number; currency: string; paidAt: string } | null;
}

interface PurchaseRecord {
  subscriptionId: string;
  apiName: string;
  planName: string;
  status: string;
  amount: number | null;
  currency: string;
  subscribedAt: string | null;
}

interface AdminOverview {
  success: boolean;
  apiCount: number;
  userCount: number;
  invoiceStats: { status: string; _sum: { amount: number | null } }[];
  dailyUsage: unknown[];
}

interface AdminFinanceData {
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

interface UserProfile {
  id: string;
  email: string;
  name?: string | null;
}

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
```

---

## 7. Component Library

### 7.1 UI Components

#### Badge

**File:** `src/components/ui/Badge.tsx`

```typescript
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  className?: string;
}
```

Renders an inline pill using the global `.badge` CSS class. Each variant maps to a corresponding `.badge-*` class or custom dark-mode-aware styles.

#### Button

**File:** `src/components/ui/Button.tsx`

```typescript
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}
```

- Uses `forwardRef` for ref forwarding
- **Variants:** `primary` (indigo), `secondary` (white/dark with border), `ghost` (transparent), `danger` (red), `success` (green), `outline` (transparent with primary border)
- **Sizes:** `sm` (32px min-height, px-3), `md` (44px min-height, px-4), `lg` (48px min-height, px-5)
- **Loading state:** Shows a `.spinner` div, hides icons, disables the button
- Maps to global `.btn-*` CSS classes defined in `globals.css`

#### Card

**File:** `src/components/ui/Card.tsx`

```typescript
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hover' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}
```

- Uses `forwardRef` for ref forwarding
- **Variants:** `default` (`.card`), `hover` (`.card-hover` -- shadow + translate on hover), `interactive` (`.card-interactive` -- hover + cursor-pointer + active scale)
- **Padding:** `none`, `sm` (p-4), `md` (p-4 sm:p-6), `lg` (p-6 sm:p-8)

#### ConfirmModal

**File:** `src/components/ui/ConfirmModal.tsx`

```typescript
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;   // default: "Confirm"
  cancelText?: string;    // default: "Cancel"
  variant?: 'danger' | 'warning' | 'primary';  // default: "danger"
  isLoading?: boolean;
}
```

Built on top of `Modal` (size="sm", no close button). Shows a variant-specific icon (Trash2/AlertTriangle/Info) with colored background. Action buttons stack vertically on mobile (column-reverse) and horizontally on desktop.

#### Input

**File:** `src/components/ui/Input.tsx`

```typescript
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}
```

- Uses `forwardRef` for ref forwarding
- Auto-generates unique `id` via `useId()` for label association
- Applies `.input` CSS class with `.input-error` when error is present
- `aria-invalid` and `aria-describedby` set for accessibility
- Left/right icons positioned absolutely within a relative container

#### Modal

**File:** `src/components/ui/Modal.tsx`

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';  // default: 'md'
  showCloseButton?: boolean;           // default: true
  footer?: React.ReactNode;
}
```

**Accessibility features:**
- Focus trap: Tab/Shift+Tab cycles through focusable elements within the modal
- Escape key closes the modal
- Click on backdrop closes the modal
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- Saves and restores previous focus on open/close
- `document.body.style.overflow = 'hidden'` prevents background scrolling

**Sizes:** sm (max-w-md), md (max-w-lg), lg (max-w-2xl), xl (max-w-4xl)

**Animation:** Uses `animate-fade-in` on backdrop and `animate-scale-in` on dialog.

#### Skeleton

**File:** `src/components/ui/Skeleton.tsx`

```typescript
interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string;
  height?: string;
  lines?: number;  // For text variant, renders multiple lines (last line is 60% width)
}
```

**Pre-built compositions:**
- `SkeletonCard` -- Simulates a content card with icon, title, description, and footer
- `SkeletonList({ count })` -- Simulates a list of items with avatar, text, and badge
- `SkeletonStats({ count })` -- Simulates a stats grid (1/2/4 columns responsive)

#### Spinner

**File:** `src/components/ui/Spinner.tsx`

```typescript
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
```

- Sizes: sm (16px), md (32px), lg (48px)
- Uses `.spinner` CSS class (animated spinning border)
- Includes `role="status"` and sr-only "Loading..." text

#### ThemeToggle

**File:** `src/components/ui/ThemeToggle.tsx`

```typescript
function ThemeToggle({ className }: { className?: string })
```

- Shows `Moon` icon in light mode, `Sun` icon in dark mode (from lucide-react)
- Calls `toggleTheme()` from `useTheme()` context
- Has `aria-label` and `title` for accessibility
- Minimum touch target of 44px (`--touch-target-min`)

### 7.2 Auth Components

#### FullScreenLoader

**File:** `src/components/auth/FullScreenLoader.tsx`

```typescript
function FullScreenLoader({ message = "Loading..." }: { message?: string })
```

Full-viewport centered layout with large `Spinner` and message text. Used as the loading state in `RequireAuth` and `RequireRole`.

#### RequireAuth

**File:** `src/components/auth/RequireAuth.tsx`

```typescript
function RequireAuth({
  children,
  redirectTo = "/login",
}: {
  children: React.ReactNode;
  redirectTo?: string;
})
```

- If `loading`: renders `FullScreenLoader`
- If not loading and no `user`: redirects to `redirectTo` (default: `/login`), renders nothing
- If authenticated: renders `children`

#### RequireRole

**File:** `src/components/auth/RequireRole.tsx`

```typescript
function RequireRole({
  roles,
  children,
  redirectTo = "/",
  unauthenticatedRedirectTo = "/login",
}: {
  roles: string[];
  children: React.ReactNode;
  redirectTo?: string;
  unauthenticatedRedirectTo?: string;
})
```

- If `loading`: renders `FullScreenLoader`
- If not authenticated: redirects to `unauthenticatedRedirectTo`
- If authenticated but no matching role: redirects to `redirectTo`
- Checks `roles.some(r => user.roles.includes(r))`
- If authorized: renders `children`

### 7.3 Layout Components

#### Header

**File:** `src/components/layout/Header.tsx`

```typescript
interface HeaderProps {
  user: AuthUser | null;
  onLogout?: () => void;
}
```

**Structure:**
- Sticky header with backdrop blur (`.header-bar` class)
- Left: Logo (API badge + "API Marketplace" text, hidden on mobile)
- Center (desktop): Navigation links (Browse APIs, Dashboard, Invoices, Activity). Conditionally shows Provider link (User/SuperAdmin role) and Admin link (SuperAdmin role).
- Right: ThemeToggle + profile dropdown (desktop) / hamburger menu (mobile)
- Profile dropdown: avatar initial, name, email, navigation links, role-specific links, logout button
- Mobile menu: animated slide-down with full navigation, user info section, and logout

**Responsive behavior:**
- Desktop (md+): horizontal nav links + profile dropdown
- Mobile (<md): hamburger icon toggles mobile menu panel

#### Footer

**File:** `src/components/layout/Footer.tsx`

- Brand section with logo and description
- Platform links: Browse APIs, Dashboard, For Providers
- Account links: Profile, Invoices, Activity
- Copyright bar with dynamic year

#### PageContainer

**File:** `src/components/layout/PageContainer.tsx`

```typescript
interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}
```

Wraps content in a `<main>` tag with `.container-custom` (max-width: 80rem with responsive padding) and vertical padding (py-6 sm:py-8).

#### ProviderApiLayout

**File:** `src/components/layout/ProviderApiLayout.tsx`

```typescript
interface ProviderApiLayoutProps {
  api: { id: string; name: string; description?: string | null; status?: string | null };
  children?: ReactNode;
}
```

Displays API workspace header with:
- Package icon in a rounded container
- API name with status badge (success for PUBLISHED/LIVE, warning otherwise)
- API description (line-clamped to 2 lines)
- Placeholder for action buttons (`#layout-header-actions`)
- Content area with `animate-slide-up` transition

### 7.4 MarkdownEditor

**File:** `src/components/MarkdownEditor.tsx`

```typescript
interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}
```

**Toolbar features:**
- Text formatting: Bold, Italic, Strikethrough, Inline Code
- Headings: H1, H2, H3
- Lists: Bullet, Numbered
- Block elements: Blockquote, Code Block, Horizontal Rule, Table, Link
- Mode toggle: Write / Preview

**Editor behavior:**
- `insertText(before, after)`: wraps selected text with prefix/suffix
- `insertBlock(block, cursorOffset)`: inserts block-level content at cursor, handles newlines
- Side-by-side layout on desktop when in preview mode (hidden raw editor on mobile)
- Uses `renderMarkdown()` from `utils/markdown.tsx` for preview
- Character count in footer
- Minimum height of 500px

---

## 8. Page Components

### LoginPage (`src/components/pages/LoginPage.tsx`)
Centered card form with email/password fields and Google OAuth button. Shows API Marketplace branding. Supports `?redirect=` for post-login navigation. Displays errors inline and via toast.

### RegisterPage (`src/components/pages/RegisterPage.tsx`)
Centered card form with name, email, password fields and Google OAuth button. Shows terms/privacy notice. Supports `?redirect=` for post-registration navigation.

### ApiListPage (`src/components/pages/ApiListPage.tsx`)
Public marketplace homepage. Displays APIs in a responsive 3-column grid. Features: search bar with submit, pagination (Previous/Next with page indicator), CTA banner for unauthenticated users. Each API card shows: icon, category, name, description, authentication method, rate limit, date, plan count.

### ApiDetailPage (`src/components/pages/ApiDetailPage.tsx`)
Single API detail page with three tabs: Overview (description, auth method, rate limits, code examples), Pricing (plan cards with subscribe/payment flow), and Documentation (rendered markdown). Sidebar shows metadata (request URL, category, last updated, changelog, error codes). Integrates Razorpay checkout for paid subscriptions -- creates subscription, generates order, opens Razorpay widget, verifies payment, redirects to dashboard.

### DashboardPage (`src/components/pages/DashboardPage.tsx`)
Consumer dashboard showing active subscriptions. Each subscription card has: API info sidebar (plan name, quota usage bar, request URL with copy button, API detail link, delete button) and API key management panel (generate new key, copy key, regenerate key, delete key). Also shows recent invoices section. Uses ConfirmModal for destructive actions (regenerate key, delete key, delete subscription).

### InvoicesPage (`src/components/pages/InvoicesPage.tsx`)
Full invoice history list. Each invoice shows: truncated ID, status badge (PAID=success, PENDING=warning, FAILED/CANCELLED=danger), API/plan name, date, period, and amount in INR. Links back to dashboard.

### ProfilePage (`src/components/pages/ProfilePage.tsx`)
Two-column layout with profile sidebar (avatar, name, email, role badges) and two forms: Personal Information (edit name, email shown as read-only) and Security (change password with current/new/confirm fields).

### ActivityPage (`src/components/pages/ActivityPage.tsx`)
Timeline of account events fetched from audit logs API. Displays action icon, label, entity info, metadata summary, and timestamp. Supports cursor-based pagination with "Load more" button. Action types include: login, logout, registration, API key operations, subscription events, payments, profile updates.

### ProviderDashboardPage (`src/components/pages/ProviderDashboardPage.tsx`)
Provider overview: lists provider's APIs with status badges, revenue summary (total, net after commission), and links to create/edit APIs.

### CreateApiPage (`src/components/pages/CreateApiPage.tsx`)
Multi-section form for creating an API: basic info (name, slug, base URL, category, description, provider display name), settings (auth method, rate limit), documentation (markdown editor), and initial plan setup (name, billing type, price, quota). Character limits enforced matching backend validation.

### EditApiPage (`src/components/pages/EditApiPage.tsx`)
Edit an existing API's settings. Same form fields as create plus plan management: view existing plans, add new plans, delete plans with confirmation dialog. Uses separate API calls for fetching API data, plans, and docs.

### ProviderApiViewPage (`src/components/pages/ProviderApiViewPage.tsx`)
Read-only overview of a provider's API within the workspace layout. Shows status, metadata, plan details, and a "Submit for Review" button when the API is in DRAFT status.

### DocumentationEditorPage (`src/components/pages/DocumentationEditorPage.tsx`)
Full-page markdown editor for API documentation within the provider workspace. Loads existing docs, allows editing with the MarkdownEditor component, and saves via `updateApi()`.

### AdminApiDetailPage (`src/components/pages/AdminApiDetailPage.tsx`)
Admin view of a single API. Shows complete API metadata, documentation (rendered markdown), plans, and provider info. Provides lifecycle management actions: approve, reject, publish, suspend, activate, with direct status change capability.

---

## 9. Design System

### 9.1 Color Palette

All colors are defined in `tailwind.config.js` with full 50-950 shade ranges:

| Token     | Base Color | Hex (500)  | Usage                              |
|-----------|-----------|------------|-------------------------------------|
| `primary` | Indigo    | `#6366f1`  | Buttons, links, active states, branding |
| `accent`  | Teal      | `#14b8a6`  | Secondary highlights, gradients     |
| `success` | Green     | `#22c55e`  | Success states, live badges, payments |
| `danger`  | Red       | `#ef4444`  | Error states, destructive actions   |
| `warning` | Amber     | `#f59e0b`  | Pending states, caution indicators  |
| `dark`    | Slate     | `#64748b`  | Neutral text, backgrounds, borders  |

**Semantic border color:** `border` is defined as `rgb(var(--color-border) / <alpha-value>)` using CSS custom properties for theme-aware borders.

### 9.2 Dark Mode Implementation

**Strategy:** Tailwind `darkMode: 'class'`

**How it works:**
1. `ThemeProvider` manages the current theme state
2. On mount, reads from `localStorage.getItem('theme')`
3. Falls back to `window.matchMedia('(prefers-color-scheme: dark)')` if no stored preference
4. Applies `'light'` or `'dark'` class to `<html>` element
5. Stores choice in localStorage on every change
6. SSR hydration safety: initial state is always `'light'` to match server render

**CSS Custom Properties (globals.css):**

```css
:root {
  --color-bg-primary: 255 255 255;      /* white */
  --color-bg-secondary: 248 250 252;    /* slate-50 */
  --color-bg-tertiary: 241 245 249;     /* slate-100 */
  --color-text-primary: 15 23 42;       /* slate-900 */
  --color-text-secondary: 71 85 105;    /* slate-600 */
  --color-text-tertiary: 148 163 184;   /* slate-400 */
  --color-border: 226 232 240;          /* slate-200 */
  --color-border-hover: 203 213 225;    /* slate-300 */
}

.dark {
  --color-bg-primary: 15 23 42;         /* slate-900 */
  --color-bg-secondary: 30 41 59;       /* slate-800 */
  --color-bg-tertiary: 51 65 85;        /* slate-700 */
  --color-text-primary: 248 250 252;    /* slate-50 */
  --color-text-secondary: 226 232 240;  /* slate-200 */
  --color-text-tertiary: 148 163 184;   /* slate-400 */
  --color-border: 51 65 85;             /* slate-700 */
  --color-border-hover: 71 85 105;      /* slate-600 */
}
```

**Theme-color meta tags** in the root layout:
- Light: `#4f46e5` (primary-600)
- Dark: `#020617` (dark-950)

### 9.3 Custom Animations

Defined in `tailwind.config.js`:

| Class              | Keyframe    | Duration | Easing   | Description                      |
|--------------------|-------------|----------|----------|----------------------------------|
| `animate-fade-in`  | `fadeIn`    | 0.2s     | ease-out | Opacity 0 -> 1                   |
| `animate-fade-out` | `fadeOut`   | 0.2s     | ease-out | Opacity 1 -> 0                   |
| `animate-slide-up` | `slideUp`   | 0.3s     | ease-out | Translate Y +10px -> 0, fade in  |
| `animate-slide-down` | `slideDown` | 0.3s   | ease-out | Translate Y -10px -> 0, fade in  |
| `animate-scale-in` | `scaleIn`   | 0.2s     | ease-out | Scale 0.95 -> 1, fade in         |
| `animate-shimmer`  | `shimmer`   | 2s       | linear (infinite) | Background position shift for loading effects |
| `animate-pulse-soft` | `pulseSoft` | 2s     | cubic-bezier (infinite) | Gentle opacity pulse 1 -> 0.5 -> 1 |

**Reduced motion:** `globals.css` includes `@media (prefers-reduced-motion: reduce)` that forces all animations to 0.01ms duration.

### 9.4 Typography

**Primary font:** Inter (loaded via `next/font/google` with `display: 'swap'`)

**Font families (tailwind.config.js):**
- `font-sans`: Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
- `font-display`: Inter, system-ui, sans-serif
- `font-mono`: JetBrains Mono, Fira Code, Consolas, monospace

**Font sizes** (with line heights):

| Class     | Size      | Line Height |
|-----------|-----------|-------------|
| `text-xs` | 0.75rem   | 1rem        |
| `text-sm` | 0.875rem  | 1.25rem     |
| `text-base` | 1rem    | 1.5rem      |
| `text-lg` | 1.125rem  | 1.75rem     |
| `text-xl` | 1.25rem   | 1.75rem     |
| `text-2xl` | 1.5rem   | 2rem        |
| `text-3xl` | 1.875rem | 2.25rem     |
| `text-4xl` | 2.25rem  | 2.5rem      |
| `text-5xl` | 3rem     | 1           |
| `text-6xl` | 3.75rem  | 1           |

### 9.5 Custom Shadows

| Class            | Description                                                  |
|------------------|--------------------------------------------------------------|
| `shadow-soft`    | Subtle double shadow for general elements                    |
| `shadow-medium`  | Medium elevation                                             |
| `shadow-large`   | Higher elevation                                             |
| `shadow-xl-light`| Extra-large with light opacity                               |
| `shadow-inner-soft` | Inset shadow for recessed elements                        |
| `shadow-card`    | Card resting state (very subtle)                             |
| `shadow-card-hover` | Card hover state (elevated)                               |

### 9.6 Responsive Breakpoints

| Breakpoint | Min Width | Usage                         |
|------------|-----------|-------------------------------|
| `xs`       | 320px     | Extra-small devices (custom)  |
| `sm`       | 640px     | Small tablets (Tailwind default) |
| `md`       | 768px     | Tablets (Tailwind default)    |
| `lg`       | 1024px    | Laptops (Tailwind default)    |
| `xl`       | 1280px    | Desktops (Tailwind default)   |
| `2xl`      | 1536px    | Large desktops (Tailwind default) |
| `4k`       | 2560px    | 4K displays (custom)          |

### 9.7 Custom Spacing

| Class | Value  |
|-------|--------|
| `18`  | 4.5rem |
| `88`  | 22rem  |
| `128` | 32rem  |

### 9.8 Global CSS Component Classes

Defined in `globals.css` under `@layer components`:

| Class                | Purpose                                                     |
|----------------------|-------------------------------------------------------------|
| `.header-bar`        | Sticky header with backdrop blur and bottom border          |
| `.card`              | Base card with rounded corners, border, shadow              |
| `.card-hover`        | Card + hover shadow + translate                             |
| `.card-interactive`  | Card-hover + cursor-pointer + active scale                  |
| `.gradient-primary`  | Primary gradient background                                 |
| `.gradient-accent`   | Accent gradient background                                  |
| `.gradient-success`  | Success gradient background                                 |
| `.gradient-mesh`     | Multi-color mesh gradient                                   |
| `.text-gradient`     | Text gradient (primary to accent)                           |
| `.text-gradient-primary` | Text gradient (primary shades)                          |
| `.btn`               | Base button with flex, padding, rounded, transitions        |
| `.btn-primary/secondary/ghost/danger/success` | Button variants                  |
| `.input`             | Styled input with focus ring                                |
| `.input-error`       | Error state for input                                       |
| `.label`             | Form label styling                                          |
| `.badge`             | Inline pill badge                                           |
| `.badge-primary/success/warning/danger` | Badge color variants                  |
| `.spinner`           | Spinning border animation                                   |
| `.skeleton`          | Skeleton loading placeholder                                |
| `.divider`           | Horizontal line divider                                     |
| `.container-custom`  | Responsive container (max 80rem, safe-area-aware padding)   |
| `.page-header`       | Page header spacing                                         |
| `.page-title`        | Large responsive title                                      |
| `.page-description`  | Subtitle text                                               |
| `.stat-card/label/value` | Statistics card styling                                 |
| `.error-message`     | Red error alert box                                         |
| `.success-message`   | Green success alert box                                     |
| `.info-message`      | Blue info alert box                                         |
| `.section-title`     | Section heading with icon gap                               |
| `.label-subtle`      | Tiny uppercase tracking label                               |

### 9.9 Global CSS Utility Classes

| Class             | Purpose                                                    |
|-------------------|------------------------------------------------------------|
| `.scrollbar-thin` | Thin native scrollbar (6px, themed for light/dark)         |
| `.scrollbar-hide` | Hidden scrollbar                                           |
| `.text-balance`   | CSS text-wrap: balance                                     |
| `.break-words-safe` | Multi-property word breaking                             |
| `.table-wrap`     | Horizontal scroll container for tables                     |
| `.safe-area-top`  | Padding for notch/safe area (top)                          |
| `.safe-area-bottom` | Padding for notch/safe area (bottom)                     |

---

## 10. Responsive Design

### Mobile-First Approach

The entire application follows Tailwind's mobile-first paradigm. Base styles target the smallest screens, with `sm:`, `md:`, `lg:`, `xl:` prefixes adding larger-screen overrides.

### Hamburger Menu

- The main navigation in `Header.tsx` is hidden on screens below `md` (768px)
- A hamburger icon button appears on mobile, toggling a slide-down panel
- The panel includes: user info, full navigation links, profile link, and logout
- Animation: `max-h-0 opacity-0` <-> `max-h-[80vh] opacity-100` with 300ms transition
- Escape key closes both the profile dropdown and mobile menu

### Grid Layouts

- **API list:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- **Stats cards:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- **Dashboard subscriptions:** `grid-cols-1` (full width cards with internal flex layout)
- **Admin dashboard:** `grid-cols-1 lg:grid-cols-3` and `grid-cols-1 lg:grid-cols-2`
- **Profile:** `grid-cols-1 lg:grid-cols-12` (4-col sidebar + 8-col content)

### Touch Targets

All interactive elements enforce a minimum touch target of `var(--touch-target-min)` = 2.75rem (44px), meeting WCAG 2.5.5 guidelines.

### Container

The `.container-custom` class provides responsive horizontal padding:
- Base: 1rem (plus safe-area insets)
- sm (640px+): 1.5rem
- lg (1024px+): 2rem
- Max width: 80rem (1280px)

### Safe Area Support

CSS custom properties handle device safe areas (notches, home indicators):
```css
--safe-area-inset-top: env(safe-area-inset-top, 0);
--safe-area-inset-bottom: env(safe-area-inset-bottom, 0);
--safe-area-inset-left: env(safe-area-inset-left, 0);
--safe-area-inset-right: env(safe-area-inset-right, 0);
```

---

## 11. Environment Variables

### Client-Side (NEXT_PUBLIC_*)

| Variable                              | Default         | Description                              |
|---------------------------------------|-----------------|------------------------------------------|
| `NEXT_PUBLIC_API_BASE_URL`            | `/api`          | Base URL for all API requests            |
| `NEXT_PUBLIC_GATEWAY_BASE_URL`        | _(derived)_     | Base URL for gateway requests (user-facing API calls) |
| `NEXT_PUBLIC_FIREBASE_API_KEY`        | _(required)_    | Firebase project API key                 |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`    | _(required)_    | Firebase auth domain                     |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`     | _(required)_    | Firebase project ID                      |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | _(optional)_    | Firebase storage bucket                  |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | _(optional)_ | Firebase messaging sender ID          |
| `NEXT_PUBLIC_FIREBASE_APP_ID`         | _(optional)_    | Firebase app ID                          |

### Server-Side

| Variable           | Default                  | Description                                  |
|--------------------|--------------------------|----------------------------------------------|
| `API_PROXY_TARGET` | `http://localhost:4000`  | Backend URL for Next.js rewrite proxy        |

---

## 12. NPM Scripts

| Script  | Command              | Description                                          |
|---------|----------------------|------------------------------------------------------|
| `dev`   | `next dev -p 5173`   | Start development server on port 5173 with hot reload |
| `build` | `next build`         | Create optimized production build                    |
| `start` | `next start -p 5173` | Serve production build on port 5173                  |
| `lint`  | `next lint`          | Run ESLint with Next.js configuration                |

---

## 13. Build Process

### Next.js Build

Running `npm run build` triggers the Next.js build pipeline:

1. **TypeScript compilation:** Strict mode, ESNext target, bundler module resolution
2. **Page analysis:** Identifies static vs. dynamic pages. All pages use `"use client"` and dynamic data fetching, so they render as client-side pages.
3. **Tailwind CSS:** PostCSS processes `globals.css` with Tailwind (scans `./src/**/*.{js,ts,jsx,tsx}` and `./app/**/*.{js,ts,jsx,tsx}`) and Autoprefixer for vendor prefixes.
4. **Font optimization:** Inter font loaded via `next/font/google` with `display: 'swap'` for optimal loading.
5. **Output:** `.next/` directory with optimized chunks, static assets, and server components.

### API Proxy via Rewrites

**File:** `next.config.ts`

```typescript
const backendTarget = process.env.API_PROXY_TARGET ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendTarget}/:path*`,
      },
    ];
  },
};
```

**How it works:**
- Client-side code calls `/api/auth/login`, `/api/subscriptions`, etc.
- Next.js rewrites strip the `/api` prefix and forward to the backend
- Example: `/api/auth/login` -> `http://localhost:4000/auth/login`
- This avoids CORS issues in development and provides a clean API boundary
- In production, the `API_PROXY_TARGET` can be set to the deployed backend URL

### TypeScript Configuration

**File:** `tsconfig.json`

Key settings:
- `strict: true` -- enables all strict type-checking options
- `target: "ESNext"` -- modern JavaScript output
- `moduleResolution: "bundler"` -- Next.js bundler-compatible resolution
- `paths: { "@/*": ["src/*"] }` -- path alias so imports use `@/components/...` instead of relative paths
- `jsx: "preserve"` -- let Next.js handle JSX transformation
- `incremental: true` -- faster subsequent builds

### External Scripts

The Razorpay checkout script is loaded via `next/script` with `strategy="afterInteractive"` in the root layout, ensuring it does not block initial page load.

---

## 14. Utility Functions

### cn() -- Class Name Merger

**File:** `src/utils/cn.ts`

```typescript
import { type ClassValue, clsx } from 'clsx';
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
```

Wraps `clsx` for conditional className composition. Used throughout all components.

### Firebase Setup

**File:** `src/utils/firebase.ts`

Initializes Firebase app with environment variables and exports:
- `auth` -- Firebase Auth instance
- `googleProvider` -- `GoogleAuthProvider` instance

In development, logs a console error if critical config (apiKey, authDomain) is missing.

### Currency Formatting

**File:** `src/utils/format.ts`

| Function | Signature | Output Example |
|----------|-----------|----------------|
| `paiseToRupees` | `(paise: number, decimals?: number) => string` | `"999"` |
| `formatINR` | `(paise: number, decimals?: number) => string` | `"₹999"` |
| `formatPlanPrice` | `(priceMonthly: number \| null, freeTier?: boolean) => string` | `"Free"` or `"₹999 /mo"` |
| `formatPercent` | `(rate: number, decimals?: number) => string` | `"10%"` |

The backend stores all monetary amounts in paise (1 INR = 100 paise).

### Gateway URL Builder

**File:** `src/utils/gatewayUrl.ts`

| Function | Purpose |
|----------|---------|
| `buildGatewayPath(apiSlug, endpointPath?)` | Returns path like `/gateway/my-api/endpoint` |
| `getGatewayBaseUrl()` | Returns base URL from env vars or window.location.origin |
| `buildGatewayUrl(apiSlug, endpointPath?)` | Returns full URL like `http://localhost:4000/gateway/my-api` |

Resolution order for base URL: `NEXT_PUBLIC_GATEWAY_BASE_URL` > `NEXT_PUBLIC_API_BASE_URL` (if absolute) > `window.location.origin`.

### Markdown Renderer

**File:** `src/utils/markdown.tsx`

Custom React-based markdown renderer (no external markdown library). Supports:
- Code blocks with language labels and copy-to-clipboard button
- Headings (H1-H3)
- Horizontal rules
- Blockquotes
- Bullet and numbered lists
- Tables with hover effects and copy-table button
- Multi-line paragraphs
- Inline formatting: bold, italic, strikethrough, inline code, links

All rendered elements are theme-aware with appropriate light/dark mode styles.
