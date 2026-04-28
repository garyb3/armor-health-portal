import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyRefreshToken,
  createToken,
  createRefreshToken,
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE_OPTIONS,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get("refresh-token")?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: "No refresh token" }, { status: 401 });
  }

  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) {
    const response = NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
    response.cookies.delete("auth-token");
    response.cookies.delete("refresh-token");
    return response;
  }

  // Verify tokenVersion against DB — this is how revocation works
  const user = await prisma.applicant.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      approved: true,
      emailVerified: true,
      tokenVersion: true,
      userCounties: { select: { county: { select: { slug: true } } } },
    },
  });

  if (!user) {
    const response = NextResponse.json({ error: "User not found" }, { status: 401 });
    response.cookies.delete("auth-token");
    response.cookies.delete("refresh-token");
    return response;
  }

  // If tokenVersion doesn't match, the token was revoked (e.g., by logout or password change)
  if (payload.tokenVersion !== user.tokenVersion) {
    const response = NextResponse.json({ error: "Token revoked" }, { status: 401 });
    response.cookies.delete("auth-token");
    response.cookies.delete("refresh-token");
    return response;
  }

  // Rotate: increment tokenVersion so the current refresh token can never be reused.
  // This limits sessions to a single device — a stolen token is invalidated on next
  // legitimate refresh.
  const updated = await prisma.applicant.update({
    where: { id: user.id },
    data: { tokenVersion: { increment: 1 } },
    select: { tokenVersion: true },
  });

  const countySlugs = user.role === "COUNTY_REP"
    ? user.userCounties.map((uc) => uc.county.slug)
    : [];

  // Issue fresh tokens with current DB state and the NEW tokenVersion
  const newPayload = {
    sub: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    approved: user.approved,
    emailVerified: user.emailVerified,
    tokenVersion: updated.tokenVersion,
    countySlugs,
  };

  const [newAccessToken, newRefreshToken] = await Promise.all([
    createToken(newPayload),
    createRefreshToken(newPayload),
  ]);

  const response = NextResponse.json({ success: true });
  response.cookies.set("auth-token", newAccessToken, ACCESS_COOKIE_OPTIONS);
  response.cookies.set("refresh-token", newRefreshToken, REFRESH_COOKIE_OPTIONS);

  return response;
}
