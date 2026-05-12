import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp, hashToken, parseJsonBody } from "@/lib/api-helpers";
import { z } from "zod/v4";
import { passwordSchema } from "@/schemas/auth";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: passwordSchema,
});

export async function POST(request: NextRequest) {
  // Rate limit: 5 attempts per minute per IP
  const ip = getClientIp(request);
  const { limited, retryAfterMs } = await rateLimit(`reset-password:${ip}`, 5, 60_000);
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((retryAfterMs || 60_000) / 1000)) } }
    );
  }

  try {
    const body = await parseJsonBody(request);
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;

    const applicant = await prisma.applicant.findUnique({
      where: { resetToken: hashToken(token) },
    });

    if (!applicant || !applicant.resetTokenExpiresAt || applicant.resetTokenExpiresAt < new Date()) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    await prisma.$transaction([
      prisma.applicant.update({
        where: { id: applicant.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiresAt: null,
          tokenVersion: { increment: 1 }, // Invalidate all existing sessions
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: applicant.id,
          action: "PASSWORD_RESET",
          targetId: applicant.id,
          ipAddress: ip,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Password has been reset. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
