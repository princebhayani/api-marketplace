/**
 * User-facing URL builder for calling APIs through our marketplace gateway.
 *
 * Backend route: /gateway/:apiSlug/*
 * See: backend/src/modules/gateway/gateway.routes.ts
 */
export function buildGatewayPath(apiSlug: string, endpointPath?: string) {
  const slug = String(apiSlug || "").trim();
  const raw = String(endpointPath || "").trim();

  const cleanedPath = raw.replace(/^\/+/, ""); // remove leading slashes

  if (!slug) return "/gateway";
  if (!cleanedPath) return `/gateway/${slug}`;
  return `/gateway/${slug}/${cleanedPath}`;
}

function stripTrailingSlashes(url: string) {
  return url.replace(/\/+$/, "");
}

/**
 * Base URL where the gateway is reachable from the user's machine.
 *
 * Prefer setting `NEXT_PUBLIC_GATEWAY_BASE_URL`, e.g. `http://localhost:4000`.
 * If not set, falls back to:
 * - `NEXT_PUBLIC_API_BASE_URL` if it's absolute (starts with http/https)
 * - `window.location.origin` in the browser
 */
export function getGatewayBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_GATEWAY_BASE_URL;
  if (explicit) return stripTrailingSlashes(explicit);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (apiBase && /^https?:\/\//i.test(apiBase)) return stripTrailingSlashes(apiBase);

  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return "";
}

export function buildGatewayUrl(apiSlug: string, endpointPath?: string) {
  const base = getGatewayBaseUrl();
  const path = buildGatewayPath(apiSlug, endpointPath);
  return base ? `${base}${path}` : path;
}

