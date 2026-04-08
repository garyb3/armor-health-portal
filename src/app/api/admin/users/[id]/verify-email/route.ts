import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorizedResponse, getClientIp } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.userRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const applicant = await prisma.applicant.findUnique({ where: { id } });
    if (!applicant) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updated = await prisma.applicant.update({
      where: { id },
      data: { emailVerified: true, verificationToken: null },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "ADMIN_VERIFY_EMAIL",
        targetId: id,
        ipAddress: getClientIp(request),
      },
    });

    return NextResponse.json({
      user: { id: updated.id, email: updated.email, emailVerified: updated.emailVerified },
    });
  } catch (error) {
    console.error("Failed to verify user email:", error);
    return NextResponse.json({ error: "Failed to verify email" }, { status: 500 });
  }
}
