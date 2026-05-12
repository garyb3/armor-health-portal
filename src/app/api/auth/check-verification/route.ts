import { NextRequest, NextResponse } from "next/server";
import { verifyToken, createToken, ACCESS_COOKIE_OPTIONS } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  // Rate limit: 15 checks per minute per IP
  const ip = getClientIp(request);
  const { limited } = await rateLimit(`check-verification:${ip}`, 15, 60_000);
  if (limited) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const token = request.cookies.get("auth-token")?.value;
  if (!token) {
    return NextResponse.json({ emailVerified: false }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ emailVerified: false }, { status: 401 });
  }

  // Already verified in token — no DB check needed
  if (payload.emailVerified) {
    return NextResponse.json({ emailVerified: true });
  }

  // Token says unverified — check DB for updated status
  const user = await prisma.applicant.findUnique({
    where: { id: payload.sub },
    select: {
      role: true,
      emailVerified: true,
      approved: true,
      tokenVersion: true,
      userCounties: { select: { county: { select: { slug: true } } } },
    },
  });

  if (!user || !user.emailVerified) {
    return NextResponse.json({ emailVerified: false });
  }

  // Rebuild countySlugs from DB, not from the stale JWT — admin assign/unassign
  // bumps tokenVersion but the old JWT still carries the old slugs.
  const countySlugs = user.role === "COUNTY_REP"
    ? user.userCounties.map((uc) => uc.county.slug)
    : [];

  // User was verified since token was issued — create a fresh token
  const newToken = await createToken({
    sub: payload.sub,
    email: payload.email,
    firstName: payload.firstName,
    lastName: payload.lastName,
    role: payload.role,
    approved: user.approved,
    emailVerified: true,
    tokenVersion: user.tokenVersion,
    countySlugs,
  });

  const response = NextResponse.json({ emailVerified: true });
  response.cookies.set("auth-token", newToken, ACCESS_COOKIE_OPTIONS);

  return response;
}
