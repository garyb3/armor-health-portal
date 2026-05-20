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
    const hashedToken = hashToken(token);
    const applicant = await prisma.applicant.findUnique({
      where: { verificationToken: hashedToken },
      include: {
        userCounties: { include: { county: { select: { slug: true } } } },
      },
    });

    if (!applicant) {
      return NextResponse.redirect(new URL("/verify-email?error=invalid-token", request.url));
    }

    // Mark email as verified and clear token. Guard the consume with
    // `verificationToken: hashedToken` in WHERE so two concurrent clicks on
    // the same link can't both succeed (token-replay race). Audit log lives
    // in the same tx so a crash between commit and log can't drop the audit row.
    const consumed = await prisma.$transaction(async (tx) => {
      const result = await tx.applicant.updateMany({
        where: { id: applicant.id, verificationToken: hashedToken },
        data: { emailVerified: true, verificationToken: null },
      });
      if (result.count === 0) return false;
      await tx.auditLog.create({
        data: {
          userId: applicant.id,
          action: "EMAIL_VERIFIED",
          targetId: applicant.id,
          ipAddress: ip,
          countyId: applicant.countyId,
        },
      });
      return true;
    });

    if (!consumed) {
      return NextResponse.redirect(new URL("/verify-email?error=invalid-token", request.url));
    }

    if (applicant.role == null) {
      return NextResponse.json({ error: "Account is not eligible for portal access" }, { status: 500 });
    }

    const countySlugs = applicant.role === "COUNTY_REP"
      ? applicant.userCounties.map((uc) => uc.county.slug)
      : [];

    const tokenPayload = {
      sub: applicant.id,
      email: applicant.email,
      firstName: applicant.firstName,
      lastName: applicant.lastName,
      role: applicant.role,
      approved: applicant.approved,
      emailVerified: true,
      tokenVersion: applicant.tokenVersion,
      countySlugs,
    };

    // Issue fresh access + refresh tokens
    const [jwt, refreshToken] = await Promise.all([
      createToken(tokenPayload),
      createRefreshToken(tokenPayload),
    ]);

    const redirectPath = pickPostLoginDestination({
      role: applicant.role,
      approved: applicant.approved,
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
