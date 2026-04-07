import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { FORM_STEPS } from "@/lib/constants";

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
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!applicant) {
    return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
  }

  const statusMap = new Map(
    applicant.formSubmissions.map((s) => [s.formType, s.status])
  );
  let currentStage = "COMPLETED";
  for (const step of FORM_STEPS) {
    const status = statusMap.get(step.key);
    if (status !== "COMPLETED" && status !== "APPROVED") {
      currentStage = step.key;
      break;
    }
  }

  const completedCount = applicant.formSubmissions.filter(
    (s) => s.status === "COMPLETED"
  ).length;

  return NextResponse.json({
    id: applicant.id,
    firstName: applicant.firstName,
    lastName: applicant.lastName,
    email: applicant.email,
    phone: applicant.phone,
    role: applicant.role,
    createdAt: applicant.createdAt.toISOString(),
    currentStage,
    completedCount,
    totalCount: FORM_STEPS.length,
    progress: applicant.formSubmissions.map((s) => ({
      formType: s.formType,
      status: s.status,
      updatedAt: s.updatedAt.toISOString(),
      statusChangedAt: s.statusChangedAt.toISOString(),
      submittedAt: s.submittedAt?.toISOString() || null,
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
