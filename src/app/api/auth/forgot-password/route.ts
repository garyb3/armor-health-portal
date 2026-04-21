import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp, hashToken } from "@/lib/api-helpers";
import { sendPasswordResetEmail } from "@/lib/email";

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

    const applicant = await prisma.applicant.findUnique({ where: { email } });
    if (!applicant) {
      return successResponse;
    }

    // Per-account throttle: if a token was issued in the last 60s, skip re-issuing.
    // Complements the per-IP rate limit above (blocks an attacker rotating IPs).
    // Returns the same successResponse so timing doesn't leak "is there a pending reset".
    if (
      applicant.resetTokenExpiresAt &&
      applicant.resetTokenExpiresAt.getTime() - Date.now() > 59 * 60 * 1000
    ) {
      return successResponse;
    }

    const rawResetToken = randomBytes(32).toString("hex");
    const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Overwriting resetToken + resetTokenExpiresAt in a single update atomically
    // invalidates any previously-issued token — the old hash is gone after this write.
    await prisma.applicant.update({
      where: { id: applicant.id },
      data: { resetToken: hashToken(rawResetToken), resetTokenExpiresAt },
    });

    await sendPasswordResetEmail({
      userName: `${applicant.firstName} ${applicant.lastName}`,
      userEmail: applicant.email,
      resetToken: rawResetToken,
    });

    return successResponse;
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
