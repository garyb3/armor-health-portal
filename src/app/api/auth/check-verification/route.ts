import { NextRequest, NextResponse } from "next/server";
import { verifyToken, createToken, ACCESS_COOKIE_OPTIONS } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
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
    select: { emailVerified: true, approved: true, tokenVersion: true },
  });

  if (!user || !user.emailVerified) {
    return NextResponse.json({ emailVerified: false });
  }

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
  });

  const response = NextResponse.json({ emailVerified: true });
  response.cookies.set("auth-token", newToken, ACCESS_COOKIE_OPTIONS);

  return response;
}
