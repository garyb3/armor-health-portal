import { NextRequest, NextResponse } from "next/server";
import { verifyToken, verifyRefreshToken } from "@/lib/auth";
import type { TokenPayload } from "@/lib/auth";

const publicPaths = ["/", "/register", "/registration-complete", "/pending-approval", "/verify-email", "/reset-password", "/api/auth/login", "/api/auth/register", "/api/auth/refresh", "/api/auth/forgot-password", "/api/auth/reset-password"];

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

/** Headers that must be stripped from incoming requests to prevent injection */
const USER_HEADERS = [
  "x-user-id", "x-user-email", "x-user-first-name",
  "x-user-last-name", "x-user-role", "x-user-approved",
];

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

  const xRequestedWith = request.headers.get("x-requested-with");
  if (xRequestedWith !== "XMLHttpRequest") {
    return NextResponse.json(
      { error: "Missing CSRF header" },
      { status: 403 }
    );
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Strip x-user-* headers from ALL incoming requests to prevent header injection
  const cleanHeaders = new Headers(request.headers);
  for (const header of USER_HEADERS) {
    cleanHeaders.delete(header);
  }

  // CSRF check for all state-changing API requests
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  // Public paths — no auth required
  if (
    publicPaths.some((p) => pathname === p) ||
    pathname.startsWith("/register/invite/") ||
    (pathname.startsWith("/api/auth/") && pathname !== "/api/auth/me" && pathname !== "/api/auth/resend-verification")
  ) {
    return NextResponse.next({ request: { headers: cleanHeaders } });
  }

  // Cron routes — require CRON_SECRET, NOT cookie auth
  if (pathname.startsWith("/api/cron/")) {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next({ request: { headers: cleanHeaders } });
  }

  // Invite validation — allow through (token is the auth, validated in the handler)
  if (/^\/api\/invites\/[^/]+$/.test(pathname)) {
    return NextResponse.next({ request: { headers: cleanHeaders } });
  }

  // Static files — only allow known safe extensions
  if (pathname.startsWith("/_next") || pathname.startsWith("/images")) {
    return NextResponse.next({ request: { headers: cleanHeaders } });
  }
  if (isStaticFile(pathname)) {
    return NextResponse.next({ request: { headers: cleanHeaders } });
  }

  // --- Authentication ---
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const redirectResponse = NextResponse.redirect(new URL("/", request.url));
    redirectResponse.cookies.delete("auth-token");
    redirectResponse.cookies.delete("refresh-token");
    return redirectResponse;
  }

  const role = payload.role || "";
  const approved = payload.approved ?? false;
  const emailVerified = payload.emailVerified ?? false;
  const isStaff = ["RECRUITER", "HR", "ADMIN", "ADMIN_ASSISTANT"].includes(role);

  // Unverified email — block everything except verify-email page and logout
  if (!emailVerified) {
    if (pathname === "/verify-email") {
      // allow through
    } else if (pathname === "/api/auth/logout" || pathname === "/api/auth/resend-verification" || pathname === "/api/auth/check-verification") {
      // allow logout, resend, and check-verification
    } else if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Email not verified" }, { status: 403 });
    } else {
      return NextResponse.redirect(new URL("/verify-email", request.url));
    }
  }

  // County reps don't need portal access — redirect to registration-complete
  if (role === "COUNTY_REPRESENTATIVE" && pathname !== "/registration-complete") {
    return NextResponse.redirect(new URL("/registration-complete", request.url));
  }

  // Unapproved staff (RECRUITER/HR) — block everything except pending-approval and logout
  if (["RECRUITER", "HR", "ADMIN_ASSISTANT"].includes(role) && !approved) {
    if (pathname === "/pending-approval") {
      // allow through
    } else if (pathname === "/api/auth/logout") {
      // allow logout
    } else if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Account pending approval" }, { status: 403 });
    } else {
      return NextResponse.redirect(new URL("/pending-approval", request.url));
    }
  }

  // Staff can only access dashboard, pipeline, and admin (not forms/onboarding)
  if (isStaff && (pathname.startsWith("/forms") || pathname === "/background-clearance")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Only ADMIN can access /admin routes
  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Applicants cannot access dashboard, pipeline, or admin routes
  if (!isStaff && (pathname === "/dashboard" || pathname.startsWith("/pipeline") || pathname.startsWith("/admin"))) {
    return NextResponse.redirect(new URL("/background-clearance", request.url));
  }

  // Set user headers on the (already cleaned) headers
  const requestHeaders = new Headers(cleanHeaders);
  requestHeaders.set("x-user-id", payload.sub);
  requestHeaders.set("x-user-email", payload.email);
  requestHeaders.set("x-user-first-name", payload.firstName);
  requestHeaders.set("x-user-last-name", payload.lastName);
  requestHeaders.set("x-user-role", role);
  requestHeaders.set("x-user-approved", String(approved));

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
