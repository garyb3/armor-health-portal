import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getUserFromRequest,
  unauthorizedResponse,
  badRequestResponse,
  getClientIp,
  parseOptionalDate,
  enforceMaxBodySize,
} from "@/lib/api-helpers";
import { FORM_TYPE_MAP, FORM_STEPS } from "@/lib/constants";
import { getNextStep } from "@/lib/pipeline-helpers";
import {
  sendStepApprovedEmail,
  sendStepDeniedEmail,
} from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import type { FormType } from "@/generated/prisma/client";
import type { FormType as AppFormType } from "@/types";

const STAFF_ROLES = ["HR", "ADMIN"];

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

    const { id: applicantId, formType: slug } = await params;
    const formType = FORM_TYPE_MAP[slug] as FormType | undefined;
    if (!formType) {
      return badRequestResponse("Invalid form type");
    }

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

    if (
      data.stepStartedAt instanceof Date &&
      data.stepCompletedAt instanceof Date &&
      data.stepCompletedAt.getTime() < data.stepStartedAt.getTime()
    ) {
      return badRequestResponse("stepCompletedAt cannot be before stepStartedAt");
    }

    if (Object.keys(data).length === 0) {
      return badRequestResponse("No date fields provided");
    }

    await prisma.$transaction([
      prisma.formSubmission.update({
        where: {
          applicantId_formType: { applicantId, formType },
        },
        data,
      }),
      prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: "STEP_DATES_UPDATED",
          targetId: applicantId,
          metadata: { formType, stepStartedAt, stepCompletedAt },
          ipAddress: getClientIp(request),
        },
      }),
    ]);

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

    const { id: applicantId, formType: slug } = await params;
    const formType = FORM_TYPE_MAP[slug] as FormType | undefined;
    if (!formType) {
      return badRequestResponse("Invalid form type");
    }

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
      select: { firstName: true, lastName: true, email: true },
    });

    if (!applicant) {
      return NextResponse.json(
        { error: "Applicant not found" },
        { status: 404 }
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
    if (action === "approve") {
      sendStepApprovedEmail({
        applicantName,
        applicantEmail: applicant.email,
        approvedStep: stepTitle,
        nextStep: nextStep?.title,
      }).catch((err) =>
        console.error("[Email] Step-approved email failed:", err)
      );
    } else {
      sendStepDeniedEmail({
        applicantName,
        applicantEmail: applicant.email,
        deniedStep: stepTitle,
        note,
      }).catch((err) =>
        console.error("[Email] Step-denied email failed:", err)
      );
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
