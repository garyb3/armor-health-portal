import { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/api-helpers";
import { validateApiKey } from "@/lib/api-key";

/**
 * Dual-auth helper: resolves the caller's identity from either
 * cookie-based auth (x-user-* headers set by middleware) or an API key
 * (x-api-key-raw header set by middleware when it detects a Bearer token).
 *
 * Existing routes that should remain cookie-only keep using getUserFromRequest().
 * Routes that want to accept API keys switch to getAuthContext() instead.
 */
export async function getAuthContext(request: NextRequest) {
  // 1. Cookie auth — middleware already verified the JWT and set x-user-* headers
  const cookieUser = getUserFromRequest(request);
  if (cookieUser) {
    return { ...cookieUser, scopes: ["read", "write"] as string[], authMethod: "cookie" as const };
  }

  // 2. API key — middleware passed the raw key through; validate against DB here
  const rawKey = request.headers.get("x-api-key-raw");
  if (rawKey) {
    const apiKey = await validateApiKey(rawKey);
    if (!apiKey) return null;
    return {
      userId: `apikey:${apiKey.id}`,
      userEmail: `apikey:${apiKey.name}`,
      userRole: apiKey.role,
      scopes: apiKey.scopes.split(","),
      authMethod: "api_key" as const,
    };
  }

  return null;
}
