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

  // Token says unapproved — check DB for updated status
  const user = await prisma.applicant.findUnique({
    where: { id: payload.sub },
    select: { approved: true, emailVerified: true, tokenVersion: true },
  });

  if (!user || !user.emailVerified || !user.approved) {
    return NextResponse.json({ approved: false });
  }

  // User was approved since token was issued — create a fresh token
  const newToken = await createToken({
    sub: payload.sub,
    email: payload.email,
    firstName: payload.firstName,
    lastName: payload.lastName,
    role: payload.role,
    approved: true,
    emailVerified: payload.emailVerified ?? false,
    tokenVersion: user.tokenVersion,
  });

  const response = NextResponse.json({ approved: true });
  response.cookies.set("auth-token", newToken, ACCESS_COOKIE_OPTIONS);

  return response;
}
