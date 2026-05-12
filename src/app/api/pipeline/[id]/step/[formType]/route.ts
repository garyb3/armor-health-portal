import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getUserFromRequest,
  unauthorizedResponse,
  badRequestResponse,
  getClientIp,
  parseOptionalDate,
  enforceMaxBodySize,
  requireCountyAccess,
  assertApplicantInCounty,
} from "@/lib/api-helpers";
import { FORM_STEPS } from "@/lib/constants";
import { getNextStep } from "@/lib/pipeline-helpers";
import {
  sendStepApprovedEmail,
  sendStepDeniedEmail,
} from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { toCountySlug } from "@/lib/counties";
import type { FormType } from "@/generated/prisma/client";
import type { FormType as AppFormType } from "@/types";

// COUNTY_REP allowed: requireCountyAccess + assertApplicantInCounty enforce tenant scoping.
const STAFF_ROLES = ["HR", "ADMIN", "COUNTY_REP"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; formType: string }> }
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

    const oversized = enforceMaxBodySize(request, 32 * 1024);
    if (oversized) return oversized;

    const ip = getClientIp(request);
    const { limited, retryAfterMs } = await rateLimit(`step-patch:${ip}`, 30, 60_000);
    if (limited) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((retryAfterMs ?? 60_000) / 1000)) } }
      );
    }

    const { id: applicantId, formType: rawFormType } = await params;
    if (!FORM_STEPS.some((s) => s.key === rawFormType)) {
      return badRequestResponse("Invalid form type");
    }
    const formType = rawFormType as FormType;

    const ownership = await assertApplicantInCounty(applicantId, county.id);
    if (ownership) return ownership;

    const body = await request.json();
    const { stepStartedAt, stepCompletedAt } = body as {
      stepStartedAt?: string | null;
      stepCompletedAt?: string | null;
    };

    // Build update data only for provided fields
    const data: Record<string, Date | null> = {};
    if (stepStartedAt !== undefined) {
      const parsed = parseOptionalDate(stepStartedAt);
      if (parsed === "invalid") return badRequestResponse("Invalid stepStartedAt");
      data.stepStartedAt = parsed;
    }
    if (stepCompletedAt !== undefined) {
      const parsed = parseOptionalDate(stepCompletedAt);
      if (parsed === "invalid") return badRequestResponse("Invalid stepCompletedAt");
      data.stepCompletedAt = parsed;
    }

    if (Object.keys(data).length === 0) {
      return badRequestResponse("No date fields provided");
    }

    // Validate the merged (existing + incoming) date pair inside the tx so a
    // single-field PATCH can't set stepCompletedAt before the saved stepStartedAt.
    const txResult = await prisma.$transaction(async (tx) => {
      const applicant = await tx.applicant.findUnique({
        where: { id: applicantId },
        select: { archivedAt: true },
      });
      if (applicant?.archivedAt) {
        return { error: "Cannot modify archived applicant", status: 409 } as const;
      }

      const existing = await tx.formSubmission.findUnique({
        where: { applicantId_formType: { applicantId, formType } },
        select: { stepStartedAt: true, stepCompletedAt: true },
      });
      if (!existing) {
        return { error: "Form submission not found", status: 404 } as const;
      }

      const mergedStarted = "stepStartedAt" in data ? (data.stepStartedAt as Date | null) : existing.stepStartedAt;
      const mergedCompleted = "stepCompletedAt" in data ? (data.stepCompletedAt as Date | null) : existing.stepCompletedAt;
      if (
        mergedStarted instanceof Date &&
        mergedCompleted instanceof Date &&
        mergedCompleted.getTime() < mergedStarted.getTime()
      ) {
        return { error: "stepCompletedAt cannot be before stepStartedAt", status: 400 } as const;
      }

      await tx.formSubmission.update({
        where: { applicantId_formType: { applicantId, formType } },
        data,
      });
      await tx.auditLog.create({
        data: {
          userId: user.userId,
          action: "STEP_DATES_UPDATED",
          targetId: applicantId,
          metadata: { formType, stepStartedAt, stepCompletedAt },
          ipAddress: getClientIp(request),
        },
      });
      return null;
    });

    if (txResult) {
      return NextResponse.json({ error: txResult.error }, { status: txResult.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Step dates update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; formType: string }> }
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

    const oversized = enforceMaxBodySize(request, 256 * 1024);
    if (oversized) return oversized;

    const clientIp = getClientIp(request);
    const { limited, retryAfterMs } = await rateLimit(`step-submit:${clientIp}`, 30, 60_000);
    if (limited) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((retryAfterMs ?? 60_000) / 1000)) } }
      );
    }

    const { id: applicantId, formType: rawFormType } = await params;
    if (!FORM_STEPS.some((s) => s.key === rawFormType)) {
      return badRequestResponse("Invalid form type");
    }
    const formType = rawFormType as FormType;

    const ownership = await assertApplicantInCounty(applicantId, county.id);
    if (ownership) return ownership;

    const body = await request.json();
    const { action, note } = body as {
      action: "approve" | "deny";
      note?: string;
    };

    if (!action || !["approve", "deny"].includes(action)) {
      return badRequestResponse("Invalid action. Must be 'approve' or 'deny'.");
    }

    const applicant = await prisma.applicant.findUnique({
      where: { id: applicantId },
      select: { firstName: true, lastName: true, email: true, archivedAt: true },
    });

    if (!applicant) {
      return NextResponse.json(
        { error: "Applicant not found" },
        { status: 404 }
      );
    }
    if (applicant.archivedAt) {
      return NextResponse.json(
        { error: "Cannot modify archived applicant" },
        { status: 409 }
      );
    }

    const applicantName = `${applicant.firstName} ${applicant.lastName}`;
    const currentStep = FORM_STEPS.find((s) => s.key === formType);
    const stepTitle = currentStep?.title || formType;

    const nextStep = action === "approve"
      ? getNextStep(formType as unknown as AppFormType)
      : null;

    // Wrap read + status check + writes in a transaction to prevent
    // concurrent requests from both passing the PENDING_REVIEW check
    const result = await prisma.$transaction(async (tx) => {
      // Fresh read inside the transaction — if another request already
      // changed the status, we'll see it here and bail out
      const submission = await tx.formSubmission.findUnique({
        where: {
          applicantId_formType: {
            applicantId,
            formType,
          },
        },
      });

      if (!submission) {
        return { error: "Form submission not found", status: 404 } as const;
      }

      if (submission.status !== "PENDING_REVIEW") {
        return {
          error: `Cannot ${action} a step with status "${submission.status}". Step must be in "PENDING_REVIEW" status.`,
          status: 400,
        } as const;
      }

      if (action === "approve") {
        await tx.formSubmission.update({
          where: { id: submission.id },
          data: {
            status: "APPROVED",
            reviewedBy: user.userId,
            reviewedAt: new Date(),
            reviewNote: note || null,
          },
        });

        // Seed next step's timer
        if (nextStep) {
          await tx.formSubmission.update({
            where: {
              applicantId_formType: {
                applicantId,
                formType: nextStep.key as FormType,
              },
            },
            data: {
              statusChangedAt: new Date(),
              lastAlertSentAt: null,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            userId: user.userId,
            action: "STEP_APPROVED",
            targetId: applicantId,
            metadata: { formType, stepTitle, note },
            ipAddress: clientIp,
          },
        });
      } else {
        await tx.formSubmission.update({
          where: { id: submission.id },
          data: {
            status: "DENIED",
            reviewedBy: user.userId,
            reviewedAt: new Date(),
            reviewNote: note || null,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: user.userId,
            action: "STEP_DENIED",
            targetId: applicantId,
            metadata: { formType, stepTitle, note },
            ipAddress: clientIp,
          },
        });
      }

      return null; // success
    });

    // If the transaction returned an error, send it back
    if (result) {
      if (result.status === 404) {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      return badRequestResponse(result.error);
    }

    // Send emails after transaction commits (fire-and-forget)
    const countySlug = toCountySlug(county.slug);
    if (action === "approve") {
      sendStepApprovedEmail({
        applicantName,
        applicantEmail: applicant.email,
        approvedStep: stepTitle,
        nextStep: nextStep?.title,
        countySlug,
      }).catch(() => {
        // email.ts logs the failure internally; swallow here to avoid double-log
      });
    } else {
      sendStepDeniedEmail({
        applicantName,
        applicantEmail: applicant.email,
        deniedStep: stepTitle,
        note,
        countySlug,
      }).catch(() => {
        // email.ts logs the failure internally; swallow here to avoid double-log
      });
    }

    return NextResponse.json({ success: true, action, formType });
  } catch (error) {
    console.error("Step approve/deny error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
