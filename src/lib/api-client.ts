/**
 * API client wrapper that automatically:
 * 1. Adds X-Requested-With header for CSRF protection
 * 2. Adds x-county-slug header derived from the current URL so /api/* routes
 *    inherit the active county from the page the user is on
 * 3. Retries once on 401 by hitting /api/auth/refresh
 */

import { getCountyFromPath } from "./counties";

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (!headers.has("X-Requested-With")) {
    headers.set("X-Requested-With", "XMLHttpRequest");
  }
  // Auto-inject the active county slug from window.location so /api/* routes
  // know which tenant to scope to. Middleware re-validates and re-emits.
  if (typeof window !== "undefined" && !headers.has("x-county-slug")) {
    const slug = getCountyFromPath(window.location.pathname);
    if (slug) headers.set("x-county-slug", slug);
  }

  const response = await fetch(input, { ...init, headers });

  // If 401 and not already a refresh request, try refreshing
  if (response.status === 401 && !String(input).includes("/api/auth/refresh")) {
    // Deduplicate concurrent refresh attempts
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshTokens().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }

    const refreshed = await (refreshPromise ?? Promise.resolve(false));
    if (refreshed) {
      // Retry the original request with fresh tokens
      return fetch(input, { ...init, headers });
    }
    // Terminal: refresh token is expired/revoked. Bounce to the login page so
    // the user isn't stuck staring at silent 401s from every call site.
    // Skip if we're already on a public/unauthenticated page.
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      const onPublicPage =
        path === "/" ||
        path === "/verify-email" ||
        path === "/reset-password" ||
        path === "/pending-approval" ||
        path.startsWith("/register/invite/");
      if (!onPublicPage) {
        window.location.href = "/";
      }
    }
  }

  return response;
}
