import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorizedResponse, getClientIp } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { FORM_STEPS } from "@/lib/constants";

const STAFF_ROLES: string[] = ["HR", "ADMIN"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  if (!STAFF_ROLES.includes(user.userRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const applicant = await prisma.applicant.findUnique({
      where: { id },
      include: {
        formSubmissions: {
          select: { formType: true, stepStartedAt: true, stepCompletedAt: true },
        },
      },
    });

    if (!applicant) {
      return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
    }
    if (applicant.archivedAt) {
      return NextResponse.json({ error: "Already archived" }, { status: 409 });
    }
    if (!applicant.offerAcceptedAt) {
      return NextResponse.json(
        { error: "Offer must be accepted before archiving" },
        { status: 409 }
      );
    }

    const completedStepTypes = new Set(
      applicant.formSubmissions
        .filter((s) => s.stepStartedAt && s.stepCompletedAt)
        .map((s) => s.formType)
    );
    const missing = FORM_STEPS.filter((step) => !completedStepTypes.has(step.key));
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: "All pipeline steps must have start and end dates before archiving",
          missingSteps: missing.map((s) => s.key),
        },
        { status: 409 }
      );
    }

    await prisma.$transaction([
      prisma.applicant.update({
        where: { id },
        data: { archivedAt: new Date(), archivedBy: user.userId },
      }),
      prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: "PIPELINE_ARCHIVE_CANDIDATE",
          targetId: id,
          ipAddress: getClientIp(request),
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to archive applicant:", error);
    return NextResponse.json({ error: "Failed to archive applicant" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  if (!STAFF_ROLES.includes(user.userRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const applicant = await prisma.applicant.findUnique({
      where: { id },
      select: { id: true, archivedAt: true },
    });

    if (!applicant) {
      return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
    }
    if (!applicant.archivedAt) {
      return NextResponse.json({ error: "Not archived" }, { status: 409 });
    }

    await prisma.$transaction([
      prisma.applicant.update({
        where: { id },
        data: { archivedAt: null, archivedBy: null },
      }),
      prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: "PIPELINE_RESTORE_CANDIDATE",
          targetId: id,
          ipAddress: getClientIp(request),
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to restore applicant:", error);
    return NextResponse.json({ error: "Failed to restore applicant" }, { status: 500 });
  }
}
