import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createToken, createRefreshToken, ACCESS_COOKIE_OPTIONS, REFRESH_COOKIE_OPTIONS } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp, hashToken } from "@/lib/api-helpers";
import { pickPostLoginDestination } from "@/lib/auth-redirect";

export async function GET(request: NextRequest) {
  // Rate limit: 10 verification attempts per minute per IP
  const ip = getClientIp(request);
  const { limited } = await rateLimit(`verify-email:${ip}`, 10, 60_000);
  if (limited) {
    return NextResponse.redirect(new URL("/verify-email?error=rate-limited", request.url));
  }

  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/verify-email?error=missing-token", request.url));
  }

  try {
    const applicant = await prisma.applicant.findUnique({
      where: { verificationToken: hashToken(token) },
    });

    if (!applicant) {
      return NextResponse.redirect(new URL("/verify-email?error=invalid-token", request.url));
    }

    // Mark email as verified and clear token — use returned record for current approved/tokenVersion
    const updated = await prisma.applicant.update({
      where: { id: applicant.id },
      data: {
        emailVerified: true,
        verificationToken: null,
      },
      include: {
        userCounties: { include: { county: { select: { slug: true } } } },
      },
    });

    const countySlugs = updated.role === "COUNTY_REP"
      ? updated.userCounties.map((uc) => uc.county.slug)
      : [];

    const tokenPayload = {
      sub: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      role: updated.role,
      approved: updated.approved,
      emailVerified: true,
      tokenVersion: updated.tokenVersion,
      countySlugs,
    };

    // Issue fresh access + refresh tokens
    const [jwt, refreshToken] = await Promise.all([
      createToken(tokenPayload),
      createRefreshToken(tokenPayload),
    ]);

    const redirectPath = pickPostLoginDestination({
      role: updated.role,
      approved: updated.approved,
      emailVerified: true,
      countySlugs,
    });

    const response = NextResponse.redirect(new URL(redirectPath, request.url));
    response.cookies.set("auth-token", jwt, ACCESS_COOKIE_OPTIONS);
    response.cookies.set("refresh-token", refreshToken, REFRESH_COOKIE_OPTIONS);

    return response;
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.redirect(new URL("/verify-email?error=server-error", request.url));
  }
}
