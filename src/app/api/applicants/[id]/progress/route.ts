import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/api-helpers";
import { FORM_STEPS } from "@/lib/constants";
import { isApprovedOrCompleted, isStepUnlocked } from "@/lib/pipeline-helpers";
import type { FormType as AppFormType, FormStatus as AppFormStatus } from "@/types";

function safeISOString(date: Date | string | null | undefined): string {
  if (!date) return new Date().toISOString();
  if (date instanceof Date) return date.toISOString();
  // Handle string dates from libsql that may lack timezone
  const d = new Date(date);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    if (id !== user.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const submissions = await prisma.formSubmission.findMany({
      where: { applicantId: user.userId },
      select: {
        formType: true,
        status: true,
        updatedAt: true,
        statusChangedAt: true,
        reviewedAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const mapped = submissions.map((s) => ({
      formType: s.formType as unknown as AppFormType,
      status: s.status as unknown as AppFormStatus,
    }));

    const completedCount = submissions.filter((s) =>
      isApprovedOrCompleted(s.status as unknown as AppFormStatus)
    ).length;

    return NextResponse.json({
      progress: submissions.map((s) => ({
        formType: s.formType,
        status: s.status,
        updatedAt: safeISOString(s.updatedAt),
        statusChangedAt: safeISOString(s.statusChangedAt),
        reviewedAt: s.reviewedAt ? safeISOString(s.reviewedAt) : null,
        isLocked: !isStepUnlocked(
          s.formType as unknown as AppFormType,
          mapped
        ),
      })),
      completedCount,
      totalCount: FORM_STEPS.length,
    });
  } catch (error) {
    console.error("Progress fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
