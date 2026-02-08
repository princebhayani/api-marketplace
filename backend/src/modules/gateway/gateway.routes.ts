import { Router, type Request, type Response, type NextFunction } from "express";
import { GatewayService } from "./gateway.service";

const router = Router();
const service = new GatewayService();

async function handleGatewayRequest(req: Request, res: Response, next: NextFunction) {
  try {
    // Get API to check authentication method
    const api = await service.getApiBySlug(req.params.apiSlug);
    // Authentication Method: API Key only (default)
    // Treat any legacy value as API Key.

    // Include query string in the path
    // - For `/gateway/:apiSlug/*` the wildcard is available at `req.params[0]`
    // - For `/gateway/:apiSlug` it will be empty (forward to baseUrl with only querystring)
    const basePath = (req.params?.[0] as string | undefined) ?? "";
    const queryString = req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : "";
    const path = basePath + queryString;

    let apiKeyId: string | null = null;
    let userId: string | null = null;
    let subscriptionId: string | null = null;
    let rateLimitIdentifier: string;
    let planLimitPerMinute: number | null = null;

    // Handle authentication (API Key only)
    const apiKeyHeader = req.headers["x-api-key"];
    if (typeof apiKeyHeader !== "string") {
      return res.status(401).json({ success: false, message: "Missing API key. Use: X-API-Key: <your-key>" });
    }

    const apiKey = await service.validateApiKey(apiKeyHeader);
    apiKeyId = apiKey.id;
    userId = apiKey.subscription.userId;
    subscriptionId = apiKey.subscription.id;
    rateLimitIdentifier = apiKey.id;

    // Per-minute rate limit: use API's public limit as cap (monthlyQuota is enforced separately as monthly quota, not per minute)
    const plan = apiKey.subscription.apiPlan;
    const publicLimit = api.publicRateLimitPerMinute ?? null;
    planLimitPerMinute = publicLimit;

    const forwardResponse = await service.forwardRequest({
      apiSlug: req.params.apiSlug,
      path,
      method: req.method,
      headers: req.headers as Record<string, string | string[] | undefined>,
      body: req.body,
      apiKeyId,
      userId,
      subscriptionId,
      rateLimitIdentifier,
      planLimitPerMinute,
    });

    // Filter out headers that shouldn't be sent back to the client
    // (axios already decompresses the response, so we shouldn't send content-encoding)
    const headersToSkip = ["content-encoding", "transfer-encoding", "connection", "keep-alive"];

    const responseHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(forwardResponse.headers)) {
      if (!headersToSkip.includes(key.toLowerCase()) && value) {
        responseHeaders[key] = String(value);
      }
    }

    res.status(forwardResponse.status).set(responseHeaders).send(forwardResponse.data);
  } catch (err) {
    next(err);
  }
}

// Allow forwarding with or without an extra path segment.
router.all("/gateway/:apiSlug", handleGatewayRequest);
router.all("/gateway/:apiSlug/*", handleGatewayRequest);

export const gatewayRouter = router;

