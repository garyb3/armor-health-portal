import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { FORM_STEPS } from "@/lib/constants";
import { isApprovedOrCompleted } from "@/lib/pipeline-helpers";
import type { Role, FormStatus as AppFormStatus } from "@/types";

const STAFF_ROLES: Role[] = ["RECRUITER", "HR", "ADMIN"];

function getCurrentStage(
  submissions: { formType: string; status: string }[]
): string {
  const statusMap = new Map(submissions.map((s) => [s.formType, s.status]));

  for (const step of FORM_STEPS) {
    const status = statusMap.get(step.key) as AppFormStatus | undefined;
    if (!status || !isApprovedOrCompleted(status)) {
      return step.key;
    }
  }
  return "COMPLETED";
}

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  if (!STAFF_ROLES.includes(user.userRole as Role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const search = request.nextUrl.searchParams.get("search") || "";

  const applicants = await prisma.applicant.findMany({
    where: {
      role: { notIn: STAFF_ROLES },
      ...(search
        ? {
            OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {}),
    },
    include: {
      formSubmissions: {
        select: {
          formType: true,
          status: true,
          updatedAt: true,
          statusChangedAt: true,
          reviewedBy: true,
          reviewedAt: true,
          reviewNote: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const byStage: Record<string, { count: number; names: string[] }> = {};
  const completedByStage: Record<string, { count: number; names: string[] }> = {};
  for (const step of FORM_STEPS) {
    byStage[step.key] = { count: 0, names: [] };
    completedByStage[step.key] = { count: 0, names: [] };
  }
  byStage["COMPLETED"] = { count: 0, names: [] };

  const mapped = applicants.map((a) => {
    const currentStage = getCurrentStage(a.formSubmissions);
    const name = `${a.firstName} ${a.lastName}`;

    if (!byStage[currentStage]) {
      byStage[currentStage] = { count: 0, names: [] };
    }
    byStage[currentStage].count++;
    byStage[currentStage].names.push(name);

    a.formSubmissions.forEach((s) => {
      if (
        isApprovedOrCompleted(s.status as AppFormStatus) &&
        completedByStage[s.formType]
      ) {
        completedByStage[s.formType].count++;
        completedByStage[s.formType].names.push(name);
      }
    });

    const completedCount = a.formSubmissions.filter((s) =>
      isApprovedOrCompleted(s.status as AppFormStatus)
    ).length;

    return {
      id: a.id,
      firstName: a.firstName,
      lastName: a.lastName,
      email: a.email,
      phone: a.phone,
      createdAt: a.createdAt.toISOString(),
      currentStage,
      completedCount,
      totalCount: FORM_STEPS.length,
      progress: a.formSubmissions.map((s) => ({
        formType: s.formType,
        status: s.status,
        updatedAt: s.updatedAt.toISOString(),
        statusChangedAt: s.statusChangedAt.toISOString(),
        reviewedBy: s.reviewedBy,
        reviewedAt: s.reviewedAt?.toISOString() ?? null,
        reviewNote: s.reviewNote,
      })),
    };
  });

  return NextResponse.json({
    applicants: mapped,
    summary: {
      total: mapped.length,
      byStage,
      completedByStage,
    },
  });
}
