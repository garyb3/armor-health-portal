import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const publicPaths = ["/", "/register", "/registration-complete", "/pending-approval", "/verify-email", "/api/auth/login", "/api/auth/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    publicPaths.some((p) => pathname === p) ||
    pathname.startsWith("/register/invite/") ||
    (pathname.startsWith("/api/auth/") && pathname !== "/api/auth/me" && pathname !== "/api/auth/resend-verification") ||
    pathname.startsWith("/api/cron/") ||
    /^\/api\/invites\/[^/]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/images") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("auth-token")?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    const response = pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      : NextResponse.redirect(new URL("/", request.url));
    response.cookies.delete("auth-token");
    return response;
  }

  const role = payload.role || "";
  const approved = payload.approved ?? false;
  const emailVerified = payload.emailVerified ?? false;
  const isStaff = ["RECRUITER", "HR", "ADMIN"].includes(role);

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
  if (["RECRUITER", "HR"].includes(role) && !approved) {
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

  const requestHeaders = new Headers(request.headers);
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
