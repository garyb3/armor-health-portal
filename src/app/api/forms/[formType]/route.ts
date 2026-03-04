import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getUserFromRequest,
  unauthorizedResponse,
  badRequestResponse,
  stripSsnFields,
} from "@/lib/api-helpers";
import { FORM_TYPE_MAP, FORM_STEPS } from "@/lib/constants";
import { sendStepCompletedEmail } from "@/lib/email";
import type { FormType, Prisma } from "@/generated/prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formType: string }> }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    const { formType: slug } = await params;
    const formType = FORM_TYPE_MAP[slug] as FormType | undefined;
    if (!formType) {
      return badRequestResponse("Invalid form type");
    }

    const submission = await prisma.formSubmission.findUnique({
      where: {
        applicantId_formType: {
          applicantId: user.userId,
          formType,
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ status: "NOT_STARTED", formData: null });
    }

    return NextResponse.json({
      id: submission.id,
      status: submission.status,
      formData: submission.formData,
      receiptFile: submission.receiptFile,
      submittedAt: submission.submittedAt?.toISOString() ?? null,
      updatedAt: submission.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Form fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formType: string }> }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    const { formType: slug } = await params;
    const formType = FORM_TYPE_MAP[slug] as FormType | undefined;
    if (!formType) {
      return badRequestResponse("Invalid form type");
    }

    const body = await request.json();
    const { formData, action } = body as {
      formData: Record<string, unknown>;
      action: "save_draft" | "submit";
    };

    if (!formData || !action) {
      return badRequestResponse("Missing formData or action");
    }

    // CRITICAL: Strip SSN fields before storing in database
    const cleanedData = stripSsnFields(formData) as Prisma.InputJsonValue;

    const newStatus = action === "submit" ? "COMPLETED" : "IN_PROGRESS";
    const submittedAt = action === "submit" ? new Date() : undefined;

    // Check current status to determine if statusChangedAt should update
    const existing = await prisma.formSubmission.findUnique({
      where: {
        applicantId_formType: {
          applicantId: user.userId,
          formType,
        },
      },
      select: { status: true },
    });

    const statusChanged = !existing || existing.status !== newStatus;

    const submission = await prisma.formSubmission.upsert({
      where: {
        applicantId_formType: {
          applicantId: user.userId,
          formType,
        },
      },
      update: {
        formData: cleanedData,
        status: newStatus,
        ...(submittedAt && { submittedAt }),
        ...(statusChanged && { statusChangedAt: new Date(), lastAlertSentAt: null }),
      },
      create: {
        applicantId: user.userId,
        formType,
        formData: cleanedData,
        status: newStatus,
        ...(submittedAt && { submittedAt }),
        statusChangedAt: new Date(),
      },
    });

    // On submission, send completion email and seed next step's 24h timer
    if (action === "submit") {
      const applicant = await prisma.applicant.findUnique({
        where: { id: user.userId },
        select: { firstName: true, lastName: true, email: true },
      });

      if (applicant) {
        const currentStep = FORM_STEPS.find((s) => s.key === formType);
        const stepTitle = currentStep?.title || formType;
        const applicantName = `${applicant.firstName} ${applicant.lastName}`;

        // Send immediate completion notification (fire-and-forget)
        sendStepCompletedEmail({
          applicantName,
          applicantEmail: applicant.email,
          completedStep: stepTitle,
        }).catch((err) =>
          console.error("[Email] Step-completed email failed:", err)
        );

        // Seed the next step's timer so the cron job picks it up after 24h
        if (currentStep) {
          const nextStep = FORM_STEPS.find(
            (s) => s.order === currentStep.order + 1
          );
          if (nextStep) {
            const nextSubmission = await prisma.formSubmission.findUnique({
              where: {
                applicantId_formType: {
                  applicantId: user.userId,
                  formType: nextStep.key as FormType,
                },
              },
              select: { status: true },
            });

            // Only reset the clock if the next step hasn't been started yet
            if (!nextSubmission || nextSubmission.status === "NOT_STARTED") {
              await prisma.formSubmission.upsert({
                where: {
                  applicantId_formType: {
                    applicantId: user.userId,
                    formType: nextStep.key as FormType,
                  },
                },
                update: {
                  statusChangedAt: new Date(),
                  lastAlertSentAt: null,
                },
                create: {
                  applicantId: user.userId,
                  formType: nextStep.key as FormType,
                  status: "NOT_STARTED",
                  statusChangedAt: new Date(),
                },
              });
            }
          }
        }
      }
    }

    return NextResponse.json({
      id: submission.id,
      status: submission.status,
      updatedAt: submission.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Form save error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
