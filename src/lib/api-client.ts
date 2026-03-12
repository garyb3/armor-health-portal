/**
 * API client wrapper that automatically:
 * 1. Adds X-Requested-With header for CSRF protection
 * 2. Retries once on 401 by hitting /api/auth/refresh
 */

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
  }

  return response;
}
