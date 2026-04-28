import { NextRequest, NextResponse } from "next/server";
import { verifyToken, verifyRefreshToken } from "@/lib/auth";
import type { TokenPayload } from "@/lib/auth";

const publicPaths = ["/", "/pending-approval", "/verify-email", "/reset-password", "/api/auth/login", "/api/auth/register", "/api/auth/refresh", "/api/auth/forgot-password", "/api/auth/reset-password", "/api/v1/health", "/api/v1/docs"];

/** Static file extensions that can bypass auth */
const STATIC_EXTENSIONS = new Set([
  ".ico", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp",
  ".css", ".js", ".map", ".woff", ".woff2", ".ttf", ".eot",
]);

function isStaticFile(pathname: string): boolean {
  const lastDot = pathname.lastIndexOf(".");
  if (lastDot === -1) return false;
  const ext = pathname.substring(lastDot).toLowerCase();
  return STATIC_EXTENSIONS.has(ext);
}

// Constant-time string compare. Edge runtime has no node:crypto.timingSafeEqual,
// so we XOR char codes over equal-length inputs. Length mismatch returns early —
// secret length is already fixed and not a useful oracle.
function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Headers that must be stripped from incoming requests to prevent injection */
const USER_HEADERS = [
  "x-user-id", "x-user-email", "x-user-first-name",
  "x-user-last-name", "x-user-role", "x-user-approved",
  "x-county-slug",
];

/** Valid county slugs. Kept as a static set since middleware runs in Edge (no Prisma). */
const COUNTY_SLUGS = new Set(["franklin", "cobb"]);

/**
 * CSRF protection: state-changing requests (POST/PUT/PATCH/DELETE) to API routes
 * must include the X-Requested-With header. Browsers won't send this header in
 * cross-origin requests without a CORS preflight, which we don't allow.
 */
function checkCsrf(request: NextRequest): NextResponse | null {
  const method = request.method;
  const { pathname } = request.nextUrl;

  // Only enforce on state-changing API requests
  if (!pathname.startsWith("/api/") || method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return null;
  }

  // Cron routes use Bearer auth, not cookies — exempt from CSRF
  if (pathname.startsWith("/api/cron/")) {
    return null;
  }

  // API key requests use Bearer auth, not cookies — exempt from CSRF
  if (request.headers.get("authorization")?.startsWith("Bearer ahp_")) {
    return null;
  }

  const xRequestedWith = request.headers.get("x-requested-with");
  if (xRequestedWith !== "XMLHttpRequest") {
    return NextResponse.json(
      { error: "Missing CSRF header" },
      { status: 403 }
    );
  }

  return null;
}

/**
 * CORS for /api/v1/ — allows external consumers from approved origins.
 * Internal routes (/api/auth/, /api/forms/, etc.) remain same-origin only.
 */
function handleCors(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/v1/")) return null;

  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const origin = request.headers.get("origin") || "";
  const isAllowed = allowedOrigins.includes(origin);

  // Preflight
  if (request.method === "OPTIONS") {
    if (!isAllowed) {
      return new NextResponse(null, { status: 403 });
    }
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // For non-preflight requests, return null to continue — CORS headers are
  // added to the final response via addCorsHeaders() below.
  return null;
}

/** Append CORS headers to an existing response for /api/v1/ routes. */
function addCorsHeaders(request: NextRequest, response: NextResponse): NextResponse {
  if (!request.nextUrl.pathname.startsWith("/api/v1/")) return response;

  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const origin = request.headers.get("origin") || "";
  if (allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Generate a per-request nonce for Content-Security-Policy
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  /** Set CSP header on any response before returning it */
  function withCsp(response: NextResponse): NextResponse {
    response.headers.set("Content-Security-Policy", cspHeader);
    return response;
  }

  // CORS preflight for /api/v1/ routes
  const corsResponse = handleCors(request);
  if (corsResponse) return withCsp(corsResponse);

  // Capture the inbound x-county-slug BEFORE stripping it. apiFetch on the client
  // sets this so /api/* requests inherit the active county from the page URL.
  const inboundCountySlug = (request.headers.get("x-county-slug") || "").toLowerCase();

  // Strip x-user-* and x-county-slug headers from ALL incoming requests to prevent header injection
  const cleanHeaders = new Headers(request.headers);
  for (const header of USER_HEADERS) {
    cleanHeaders.delete(header);
  }
  // Pass the nonce to the application via request header
  cleanHeaders.set("x-nonce", nonce);

  // CSRF check for all state-changing API requests
  const csrfError = checkCsrf(request);
  if (csrfError) return withCsp(csrfError);

  // Public paths — no auth required
  if (
    publicPaths.some((p) => pathname === p) ||
    pathname.startsWith("/register/invite/") ||
    (pathname.startsWith("/api/auth/") && pathname !== "/api/auth/me" && pathname !== "/api/auth/resend-verification")
  ) {
    return withCsp(NextResponse.next({ request: { headers: cleanHeaders } }));
  }

  // Cron routes — require CRON_SECRET, NOT cookie auth
  if (pathname.startsWith("/api/cron/")) {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || !authHeader || !timingSafeEqualStr(authHeader, `Bearer ${cronSecret}`)) {
      return withCsp(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }
    return withCsp(NextResponse.next({ request: { headers: cleanHeaders } }));
  }

  // Invite validation — allow through (token is the auth, validated in the handler)
  if (/^\/api\/invites\/[^/]+$/.test(pathname)) {
    return withCsp(NextResponse.next({ request: { headers: cleanHeaders } }));
  }

  // Static files — only allow known safe extensions
  if (pathname.startsWith("/_next") || pathname.startsWith("/images")) {
    return withCsp(NextResponse.next({ request: { headers: cleanHeaders } }));
  }
  if (isStaticFile(pathname)) {
    return withCsp(NextResponse.next({ request: { headers: cleanHeaders } }));
  }

  // --- Authentication ---

  // API key Bearer auth for /api/ routes — pass key to route handler for DB validation
  if (pathname.startsWith("/api/")) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ahp_")) {
      const requestHeaders = new Headers(cleanHeaders);
      requestHeaders.set("x-api-key-raw", authHeader.substring(7));
      return withCsp(addCorsHeaders(request, NextResponse.next({ request: { headers: requestHeaders } })));
    }
  }

  // Cookie-based auth
  const accessToken = request.cookies.get("auth-token")?.value;
  const refreshToken = request.cookies.get("refresh-token")?.value;

  let payload: TokenPayload | null = null;

  if (accessToken) {
    payload = await verifyToken(accessToken);
  }

  // Access token expired/invalid — try refresh token to allow this request through.
  // We do NOT issue a new access token here because middleware (Edge runtime) cannot
  // check tokenVersion against the DB. The client-side apiFetch wrapper will detect
  // the subsequent 401 and call /api/auth/refresh, which performs the full DB check.
  if (!payload && refreshToken) {
    const refreshPayload = await verifyRefreshToken(refreshToken);
    if (refreshPayload) {
      payload = refreshPayload;
    }
  }

  if (!payload) {
    if (pathname.startsWith("/api/")) {
      return withCsp(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }
    const redirectResponse = NextResponse.redirect(new URL("/", request.url));
    redirectResponse.cookies.delete("auth-token");
    redirectResponse.cookies.delete("refresh-token");
    return withCsp(redirectResponse);
  }

  const role = payload.role || "";
  const approved = payload.approved ?? false;
  const emailVerified = payload.emailVerified ?? false;
  const isStaff = ["HR", "ADMIN"].includes(role);

  // Unverified email — block everything except verify-email page and logout
  if (!emailVerified) {
    if (pathname === "/verify-email") {
      // allow through
    } else if (pathname === "/api/auth/logout" || pathname === "/api/auth/resend-verification" || pathname === "/api/auth/check-verification" || pathname === "/api/auth/me") {
      // allow logout, resend, check-verification, and me
    } else if (pathname.startsWith("/api/")) {
      return withCsp(NextResponse.json({ error: "Email not verified" }, { status: 403 }));
    } else {
      return withCsp(NextResponse.redirect(new URL("/verify-email", request.url)));
    }
  }

  // Unapproved staff — block everything except pending-approval and logout
  if (["HR"].includes(role) && !approved) {
    if (pathname === "/pending-approval") {
      // allow through
    } else if (pathname === "/api/auth/logout") {
      // allow logout
    } else if (pathname.startsWith("/api/")) {
      return withCsp(NextResponse.json({ error: "Account pending approval" }, { status: 403 }));
    } else {
      return withCsp(NextResponse.redirect(new URL("/pending-approval", request.url)));
    }
  }

  // Only ADMIN can access /admin routes (legacy /admin/* and new /[county]/admin/*)
  const isAdminPath =
    pathname.startsWith("/admin") ||
    /^\/[^/]+\/admin(\/|$)/.test(pathname);
  if (isAdminPath && role !== "ADMIN") {
    if (pathname.startsWith("/api/admin")) {
      return withCsp(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }
    return withCsp(NextResponse.redirect(new URL("/franklin/pipeline", request.url)));
  }

  // Set user headers on the (already cleaned) headers
  const requestHeaders = new Headers(cleanHeaders);
  requestHeaders.set("x-user-id", payload.sub);
  requestHeaders.set("x-user-email", payload.email);
  requestHeaders.set("x-user-first-name", payload.firstName);
  requestHeaders.set("x-user-last-name", payload.lastName);
  requestHeaders.set("x-user-role", role);
  requestHeaders.set("x-user-approved", String(approved));

  // Determine the active county slug for this request:
  //   - For /[county]/* page paths: extract from URL
  //   - For /api/* calls: trust the inbound x-county-slug header (set by apiFetch
  //     based on the page URL). The API helper also validates user access.
  // PR 4 will enforce COUNTY_REP membership here; for now HR/ADMIN are global.
  const pageCountyMatch = pathname.match(/^\/([^/?#]+)(?:\/|$)/);
  const pageCandidateSlug = pageCountyMatch?.[1]?.toLowerCase();
  let activeCountySlug: string | null = null;
  if (pageCandidateSlug && COUNTY_SLUGS.has(pageCandidateSlug)) {
    activeCountySlug = pageCandidateSlug;
  } else if (pathname.startsWith("/api/") && COUNTY_SLUGS.has(inboundCountySlug)) {
    activeCountySlug = inboundCountySlug;
  }
  if (activeCountySlug) {
    requestHeaders.set("x-county-slug", activeCountySlug);
  }

  return withCsp(addCorsHeaders(request, NextResponse.next({ request: { headers: requestHeaders } })));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
