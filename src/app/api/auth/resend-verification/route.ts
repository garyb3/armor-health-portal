import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { hashToken } from "@/lib/api-helpers";
import { toCountySlug } from "@/lib/counties";

export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id");

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 1 resend per 60 seconds per user
  const { limited, retryAfterMs } = await rateLimit(`resend-verification:${userId}`, 1, 60_000);
  if (limited) {
    return NextResponse.json(
      { error: "Please wait before requesting another verification email" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((retryAfterMs || 60_000) / 1000)) } }
    );
  }

  try {
    const applicant = await prisma.applicant.findUnique({
      where: { id: userId },
      include: { county: { select: { slug: true } } },
    });

    if (!applicant) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (applicant.emailVerified) {
      return NextResponse.json({ error: "Email already verified" }, { status: 400 });
    }

    const rawVerificationToken = randomBytes(32).toString("hex");
    await prisma.applicant.update({
      where: { id: userId },
      data: { verificationToken: hashToken(rawVerificationToken) },
    });

    try {
      await sendVerificationEmail({
        userName: `${applicant.firstName} ${applicant.lastName}`,
        userEmail: applicant.email,
        verificationToken: rawVerificationToken,
        countySlug: toCountySlug(applicant.county?.slug),
      });
    } catch {
      // email.ts logs the failure internally; just surface a 500 to the caller
      return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
