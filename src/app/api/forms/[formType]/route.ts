import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getUserFromRequest,
  unauthorizedResponse,
  badRequestResponse,
  stripSsnFields,
} from "@/lib/api-helpers";
import { FORM_TYPE_MAP, FORM_STEPS } from "@/lib/constants";
import { sendStepCompletedEmail, sendBciReceiptToCountyRep } from "@/lib/email";
import { isStepUnlocked } from "@/lib/pipeline-helpers";
import type { FormType, Prisma } from "@/generated/prisma/client";
import type { FormType as AppFormType, FormStatus as AppFormStatus } from "@/types";

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

    // Check step is unlocked (previous step must be approved)
    const allSubmissions = await prisma.formSubmission.findMany({
      where: { applicantId: user.userId },
      select: { formType: true, status: true },
    });

    const unlocked = isStepUnlocked(
      formType as unknown as AppFormType,
      allSubmissions.map((s) => ({
        formType: s.formType as unknown as AppFormType,
        status: s.status as unknown as AppFormStatus,
      }))
    );

    if (!unlocked) {
      return NextResponse.json(
        { error: "This step is locked. Complete the previous step first." },
        { status: 403 }
      );
    }

    // CRITICAL: Strip SSN fields before storing in database
    const cleanedData = stripSsnFields(formData) as Prisma.InputJsonValue;

    const newStatus = action === "submit" ? "PENDING_REVIEW" : "IN_PROGRESS";
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

    // On submission, send completion email to admin
    if (action === "submit") {
      const applicant = await prisma.applicant.findUnique({
        where: { id: user.userId },
        select: { firstName: true, lastName: true, email: true },
      });

      if (applicant) {
        const currentStep = FORM_STEPS.find((s) => s.key === formType);
        const stepTitle = currentStep?.title || formType;
        const applicantName = `${applicant.firstName} ${applicant.lastName}`;

        // Send immediate completion notification to admin (fire-and-forget)
        sendStepCompletedEmail({
          applicantName,
          applicantEmail: applicant.email,
          completedStep: stepTitle,
        }).catch((err) =>
          console.error("[Email] Step-completed email failed:", err)
        );

        // Send BCI receipt to county representative(s) when background check is submitted
        if (formType === "BACKGROUND_CHECK") {
          const bciSubmission = await prisma.formSubmission.findUnique({
            where: {
              applicantId_formType: {
                applicantId: user.userId,
                formType: "BACKGROUND_CHECK",
              },
            },
            select: { receiptFile: true },
          });

          if (bciSubmission?.receiptFile) {
            sendBciReceiptToCountyRep({
              applicantName,
              applicantEmail: applicant.email,
              receiptFilePath: bciSubmission.receiptFile,
            }).catch((err) =>
              console.error("[Email] BCI receipt email to county rep failed:", err)
            );
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
