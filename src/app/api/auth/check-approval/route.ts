import { NextRequest, NextResponse } from "next/server";
import { verifyToken, createToken, ACCESS_COOKIE_OPTIONS } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  // Rate limit: 15 checks per minute per IP
  const ip = getClientIp(request);
  const { limited } = await rateLimit(`check-approval:${ip}`, 15, 60_000);
  if (limited) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const token = request.cookies.get("auth-token")?.value;
  if (!token) {
    return NextResponse.json({ approved: false }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ approved: false }, { status: 401 });
  }

  // Already approved in token — no DB check needed
  if (payload.approved) {
    return NextResponse.json({ approved: true });
  }

  // Token says unapproved — check DB for updated status.
  // "approved" here means "fully cleared to enter the portal": approved AND emailVerified.
  // Pending-approval polling depends on this combined gate.
  const user = await prisma.applicant.findUnique({
    where: { id: payload.sub },
    select: {
      role: true,
      approved: true,
      emailVerified: true,
      tokenVersion: true,
      userCounties: { select: { county: { select: { slug: true } } } },
    },
  });

  if (!user || !user.emailVerified || !user.approved) {
    return NextResponse.json({ approved: false });
  }

  // Rebuild countySlugs from DB, not from the stale JWT — admin assign/unassign
  // bumps tokenVersion but the old JWT still carries the old slugs.
  const countySlugs = user.role === "COUNTY_REP"
    ? user.userCounties.map((uc) => uc.county.slug)
    : [];

  // User was approved since token was issued — create a fresh token
  const newToken = await createToken({
    sub: payload.sub,
    email: payload.email,
    firstName: payload.firstName,
    lastName: payload.lastName,
    role: payload.role,
    approved: true,
    emailVerified: true,
    tokenVersion: user.tokenVersion,
    countySlugs,
  });

  const response = NextResponse.json({ approved: true });
  response.cookies.set("auth-token", newToken, ACCESS_COOKIE_OPTIONS);

  return response;
}
