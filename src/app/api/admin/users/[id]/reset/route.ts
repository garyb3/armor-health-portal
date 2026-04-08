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

  const applicant = await prisma.applicant.findUnique({ where: { id } });
  if (!applicant) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Use transaction to prevent data loss if server crashes mid-operation
  const formTypes = ["VOLUNTEER_APP", "PROFESSIONAL_LICENSE", "DRUG_SCREEN", "BACKGROUND_CHECK"] as const;
  await prisma.$transaction(async (tx) => {
    await tx.formSubmission.deleteMany({
      where: { applicantId: id },
    });
    for (const formType of formTypes) {
      await tx.formSubmission.create({
        data: { applicantId: id, formType, status: "NOT_STARTED" },
      });
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: user.userId,
      action: "ADMIN_RESET_PIPELINE",
      targetId: id,
      ipAddress: getClientIp(request),
    },
  });

  return NextResponse.json({ success: true });
}
