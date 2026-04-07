import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getUserFromRequest,
  unauthorizedResponse,
  badRequestResponse,
  getClientIp,
} from "@/lib/api-helpers";
import { FORM_TYPE_MAP, FORM_STEPS } from "@/lib/constants";
import { getNextStep } from "@/lib/pipeline-helpers";
import {
  sendStepApprovedEmail,
  sendStepDeniedEmail,
} from "@/lib/email";
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
      data.stepStartedAt = stepStartedAt ? new Date(stepStartedAt) : null;
    }
    if (stepCompletedAt !== undefined) {
      data.stepCompletedAt = stepCompletedAt ? new Date(stepCompletedAt) : null;
    }

    if (Object.keys(data).length === 0) {
      return badRequestResponse("No date fields provided");
    }

    await prisma.formSubmission.update({
      where: {
        applicantId_formType: { applicantId, formType },
      },
      data,
    });

    // Audit log
    const clientIp = getClientIp(request);
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "STEP_DATES_UPDATED",
        targetId: applicantId,
        metadata: { formType, stepStartedAt, stepCompletedAt },
        ipAddress: clientIp,
      },
    });

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

    const clientIp = getClientIp(request);

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

    // Find the submission
    const submission = await prisma.formSubmission.findUnique({
      where: {
        applicantId_formType: {
          applicantId,
          formType,
        },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Form submission not found" },
        { status: 404 }
      );
    }

    // Only allow approve/deny on PENDING_REVIEW status
    if (submission.status !== "PENDING_REVIEW") {
      return badRequestResponse(
        `Cannot ${action} a step with status "${submission.status}". Step must be in "PENDING_REVIEW" status.`
      );
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

    if (action === "approve") {
      // Update submission to APPROVED
      await prisma.formSubmission.update({
        where: { id: submission.id },
        data: {
          status: "APPROVED",
          reviewedBy: user.userId,
          reviewedAt: new Date(),
          reviewNote: note || null,
        },
      });

      // Seed next step's timer
      const nextStep = getNextStep(formType as unknown as AppFormType);
      if (nextStep) {
        await prisma.formSubmission.update({
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

      // Send approval email to applicant
      sendStepApprovedEmail({
        applicantName,
        applicantEmail: applicant.email,
        approvedStep: stepTitle,
        nextStep: nextStep?.title,
      }).catch((err) =>
        console.error("[Email] Step-approved email failed:", err)
      );

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: "STEP_APPROVED",
          targetId: applicantId,
          metadata: { formType, stepTitle, note },
          ipAddress: clientIp,
        },
      });
    } else {
      // Deny — update submission to DENIED
      await prisma.formSubmission.update({
        where: { id: submission.id },
        data: {
          status: "DENIED",
          reviewedBy: user.userId,
          reviewedAt: new Date(),
          reviewNote: note || null,
        },
      });

      // Send denial email to applicant
      sendStepDeniedEmail({
        applicantName,
        applicantEmail: applicant.email,
        deniedStep: stepTitle,
        note,
      }).catch((err) =>
        console.error("[Email] Step-denied email failed:", err)
      );

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: "STEP_DENIED",
          targetId: applicantId,
          metadata: { formType, stepTitle, note },
          ipAddress: clientIp,
        },
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
