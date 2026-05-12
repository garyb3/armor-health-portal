import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorizedResponse, getClientIp, stripSsnFields, parseOptionalDate, requireCountyAccess, assertApplicantInCounty } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { FORM_STEPS } from "@/lib/constants";
import { getCurrentStep } from "@/lib/pipeline-helpers";
import type { FormType, FormStatus as AppFormStatus } from "@/types";

// COUNTY_REP allowed: requireCountyAccess + assertApplicantInCounty enforce tenant scoping.
const STAFF_ROLES: string[] = ["HR", "ADMIN", "COUNTY_REP"];

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

  const countyResult = await requireCountyAccess(request, user);
  if (countyResult instanceof NextResponse) return countyResult;
  const { county } = countyResult;

  const { id } = await params;

  const ownership = await assertApplicantInCounty(id, county.id);
  if (ownership) return ownership;

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

  const REVIEW_STATUSES = new Set(["PENDING_REVIEW", "APPROVED", "COMPLETED", "DENIED"]);
  const effectiveSubmissions = applicant.formSubmissions.map((s) => ({
    ...s,
    effectiveStatus:
      !REVIEW_STATUSES.has(s.status) && s.stepStartedAt && s.stepCompletedAt
        ? "COMPLETED"
        : s.status,
  }));

  const submissions = effectiveSubmissions.map((s) => ({
    formType: s.formType as FormType,
    status: s.effectiveStatus as AppFormStatus,
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
    progress: effectiveSubmissions.map((s) => ({
      formType: s.formType,
      status: s.effectiveStatus,
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

  const countyResult = await requireCountyAccess(request, user);
  if (countyResult instanceof NextResponse) return countyResult;
  const { county } = countyResult;

  const { id } = await params;

  const ownership = await assertApplicantInCounty(id, county.id);
  if (ownership) return ownership;

  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};
    let emailChanged: { from: string; to: string } | null = null;

    if (body.notes !== undefined) data.notes = body.notes || null;
    if (body.offerAcceptedAt !== undefined) {
      const parsed = parseOptionalDate(body.offerAcceptedAt);
      if (parsed === "invalid") {
        return NextResponse.json({ error: "Invalid offerAcceptedAt" }, { status: 400 });
      }
      if (parsed && parsed.getTime() > Date.now()) {
        return NextResponse.json({ error: "offerAcceptedAt cannot be in the future" }, { status: 400 });
      }
      data.offerAcceptedAt = parsed;
    }

    if (body.firstName !== undefined) {
      const v = String(body.firstName).trim();
      if (!v) return NextResponse.json({ error: "First name is required" }, { status: 400 });
      if (v.length > 100) return NextResponse.json({ error: "First name is too long" }, { status: 400 });
      data.firstName = v;
    }
    if (body.lastName !== undefined) {
      const v = String(body.lastName).trim();
      if (!v) return NextResponse.json({ error: "Last name is required" }, { status: 400 });
      if (v.length > 100) return NextResponse.json({ error: "Last name is too long" }, { status: 400 });
      data.lastName = v;
    }
    if (body.email !== undefined) {
      const v = String(body.email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        return NextResponse.json({ error: "Invalid email" }, { status: 400 });
      }
      const current = await prisma.applicant.findUnique({
        where: { id },
        select: { email: true, role: true },
      });
      if (!current) return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
      if (current.email.toLowerCase() !== v) {
        // Staff email changes must be done by the account owner — otherwise HR
        // could swap a colleague's email and take over via forgot-password.
        if (current.role && STAFF_ROLES.includes(current.role)) {
          return NextResponse.json(
            { error: "Staff email changes must be done by the account owner" },
            { status: 403 }
          );
        }
        data.email = v;
        // Invalidate any in-flight password reset aimed at the old address.
        data.resetToken = null;
        data.resetTokenExpiresAt = null;
        emailChanged = { from: current.email, to: v };
      }
    }
    if (body.phone !== undefined) {
      const v = body.phone === null ? "" : String(body.phone).trim();
      data.phone = v ? v : null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields provided" }, { status: 400 });
    }

    try {
      await prisma.$transaction([
        prisma.applicant.update({ where: { id }, data }),
        prisma.auditLog.create({
          data: {
            userId: user.userId,
            action: "APPLICANT_UPDATED",
            targetId: id,
            ipAddress: getClientIp(request),
            metadata: {
              updatedFields: Object.keys(data),
              ...(emailChanged ? { emailChanged } : {}),
            },
          },
        }),
      ]);
    } catch (e: unknown) {
      if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
      throw e;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update applicant:", error);
    return NextResponse.json({ error: "Failed to update applicant" }, { status: 500 });
  }
}
