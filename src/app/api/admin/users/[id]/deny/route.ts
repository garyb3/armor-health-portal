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
    // Soft-deny: preserve the record for audit trail instead of hard-deleting.
    // Incrementing tokenVersion revokes any active sessions immediately.
    await prisma.$transaction([
      prisma.applicant.update({
        where: { id },
        data: { approved: false, denied: true, tokenVersion: { increment: 1 } },
      }),
      prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: "ADMIN_DENY_USER",
          targetId: id,
          ipAddress: getClientIp(request),
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to deny user:", error);
    return NextResponse.json({ error: "Failed to deny user" }, { status: 500 });
  }
}
