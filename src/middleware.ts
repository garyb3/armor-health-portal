import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const publicPaths = ["/", "/register", "/api/auth/login", "/api/auth/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    publicPaths.some((p) => pathname === p) ||
    pathname.startsWith("/register/invite/") ||
    pathname.startsWith("/api/auth/") ||
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
  const isStaff = ["RECRUITER", "HR", "ADMIN_ASSISTANT", "COUNTY_REPRESENTATIVE"].includes(role);

  // Staff can only access dashboard and pipeline detail (not forms/onboarding)
  if (isStaff && (pathname.startsWith("/forms") || pathname === "/onboarding")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Applicants cannot access dashboard or pipeline routes
  if (!isStaff && (pathname === "/dashboard" || pathname.startsWith("/pipeline"))) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", payload.sub);
  requestHeaders.set("x-user-email", payload.email);
  requestHeaders.set("x-user-first-name", payload.firstName);
  requestHeaders.set("x-user-last-name", payload.lastName);
  requestHeaders.set("x-user-role", role);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
