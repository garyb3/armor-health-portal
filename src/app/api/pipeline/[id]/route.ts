import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorizedResponse, getClientIp, stripSsnFields } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { FORM_STEPS } from "@/lib/constants";
import { getCurrentStep } from "@/lib/pipeline-helpers";
import type { FormType, FormStatus as AppFormStatus } from "@/types";

const STAFF_ROLES: string[] = ["HR", "ADMIN"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  if (!STAFF_ROLES.includes(user.userRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const applicant = await prisma.applicant.findUnique({
    where: { id },
    include: {
      formSubmissions: {
        select: {
          formType: true,
          status: true,
          formData: true,
          submittedAt: true,
          updatedAt: true,
          statusChangedAt: true,
          stepStartedAt: true,
          stepCompletedAt: true,
          reviewedBy: true,
          reviewedAt: true,
          reviewNote: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!applicant) {
    return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
  }

  const submissions = applicant.formSubmissions.map((s) => ({
    formType: s.formType as FormType,
    status: s.status as AppFormStatus,
  }));
  const currentStage = getCurrentStep(submissions);
  const completedCount = applicant.formSubmissions.filter(
    (s) => s.stepStartedAt && s.stepCompletedAt
  ).length;

  return NextResponse.json({
    id: applicant.id,
    firstName: applicant.firstName,
    lastName: applicant.lastName,
    email: applicant.email,
    phone: applicant.phone,
    role: applicant.role,
    createdAt: applicant.createdAt.toISOString(),
    offerAcceptedAt: applicant.offerAcceptedAt?.toISOString() ?? null,
    notes: applicant.notes ?? null,
    currentStage,
    completedCount,
    totalCount: FORM_STEPS.length,
    progress: applicant.formSubmissions.map((s) => ({
      formType: s.formType,
      status: s.status,
      formData: s.formData ? stripSsnFields(s.formData as Record<string, unknown>) : null,
      updatedAt: s.updatedAt.toISOString(),
      statusChangedAt: s.statusChangedAt.toISOString(),
      stepStartedAt: s.stepStartedAt?.toISOString() ?? null,
      stepCompletedAt: s.stepCompletedAt?.toISOString() ?? null,
      submittedAt: s.submittedAt?.toISOString() || null,
      reviewedBy: s.reviewedBy ?? null,
      reviewedAt: s.reviewedAt?.toISOString() ?? null,
      reviewNote: s.reviewNote ?? null,
    })),
  });
  } catch (error) {
    console.error("Pipeline applicant fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.notes !== undefined) data.notes = body.notes || null;
    if (body.offerAcceptedAt !== undefined) {
      data.offerAcceptedAt = body.offerAcceptedAt
        ? new Date(body.offerAcceptedAt)
        : null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields provided" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.applicant.update({ where: { id }, data }),
      prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: "APPLICANT_UPDATED",
          targetId: id,
          ipAddress: getClientIp(request),
          metadata: { updatedFields: Object.keys(data) },
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update applicant:", error);
    return NextResponse.json({ error: "Failed to update applicant" }, { status: 500 });
  }
}
