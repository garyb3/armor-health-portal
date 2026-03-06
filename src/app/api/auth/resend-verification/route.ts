import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id");

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const applicant = await prisma.applicant.findUnique({
      where: { id: userId },
    });

    if (!applicant) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (applicant.emailVerified) {
      return NextResponse.json({ error: "Email already verified" }, { status: 400 });
    }

    // Rate limit: only allow resend if last update was >60s ago
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);
    if (applicant.updatedAt > sixtySecondsAgo) {
      return NextResponse.json(
        { error: "Please wait before requesting another verification email" },
        { status: 429 }
      );
    }

    const verificationToken = randomUUID();
    await prisma.applicant.update({
      where: { id: userId },
      data: { verificationToken },
    });

    await sendVerificationEmail({
      userName: `${applicant.firstName} ${applicant.lastName}`,
      userEmail: applicant.email,
      verificationToken,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
