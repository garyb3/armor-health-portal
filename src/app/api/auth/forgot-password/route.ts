import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp, hashToken } from "@/lib/api-helpers";
import { sendPasswordResetEmail } from "@/lib/email";
import { toCountySlug } from "@/lib/counties";

const TOKEN_LIFETIME_MS = 60 * 60 * 1000; // 1 hour
const RESEND_THROTTLE_MS = 60 * 1000; // 1 minute per-account

export async function POST(request: NextRequest) {
  // Rate limit: 3 attempts per minute per IP
  const ip = getClientIp(request);
  const { limited, retryAfterMs } = await rateLimit(`forgot-password:${ip}`, 3, 60_000);
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((retryAfterMs || 60_000) / 1000)) } }
    );
  }

  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Always return success to prevent email enumeration
    const successResponse = NextResponse.json({
      success: true,
      message: "If an account with that email exists, a password reset link has been sent.",
    });

    const applicant = await prisma.applicant.findUnique({
      where: { email },
      include: { county: { select: { slug: true } } },
    });
    if (!applicant) {
      return successResponse;
    }

    // Per-account throttle: skip re-issue if a token was issued within RESEND_THROTTLE_MS. Complements per-IP rate limit.
    if (
      applicant.resetTokenExpiresAt &&
      Date.now() - (applicant.resetTokenExpiresAt.getTime() - TOKEN_LIFETIME_MS) < RESEND_THROTTLE_MS
    ) {
      return successResponse;
    }

    const rawResetToken = randomBytes(32).toString("hex");
    const resetTokenExpiresAt = new Date(Date.now() + TOKEN_LIFETIME_MS);

    // Overwriting resetToken + resetTokenExpiresAt in a single update atomically
    // invalidates any previously-issued token — the old hash is gone after this write.
    await prisma.applicant.update({
      where: { id: applicant.id },
      data: { resetToken: hashToken(rawResetToken), resetTokenExpiresAt },
    });

    // Fire-and-forget the email so response timing doesn't reveal whether the
    // address mapped to an account. All three branches (no-account, throttled,
    // issued) now return after a single DB read + at-most-one DB write.
    sendPasswordResetEmail({
      userName: `${applicant.firstName} ${applicant.lastName}`,
      userEmail: applicant.email,
      resetToken: rawResetToken,
      countySlug: toCountySlug(applicant.county?.slug),
    }).catch((err) => {
      console.error("Password reset email failed:", err);
    });

    return successResponse;
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
