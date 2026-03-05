import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { FORM_STEPS } from "@/lib/constants";
import type { Role } from "@/types";

const STAFF_ROLES: Role[] = ["RECRUITER", "HR"];

function getCurrentStage(
  submissions: { formType: string; status: string }[]
): string {
  const statusMap = new Map(submissions.map((s) => [s.formType, s.status]));

  for (const step of FORM_STEPS) {
    if (statusMap.get(step.key) !== "COMPLETED") {
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
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const byStage: Record<string, number> = {};
  for (const step of FORM_STEPS) {
    byStage[step.key] = 0;
  }
  byStage["COMPLETED"] = 0;

  const mapped = applicants.map((a) => {
    const currentStage = getCurrentStage(a.formSubmissions);
    byStage[currentStage] = (byStage[currentStage] || 0) + 1;

    const completedCount = a.formSubmissions.filter(
      (s) => s.status === "COMPLETED"
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
      })),
    };
  });

  return NextResponse.json({
    applicants: mapped,
    summary: {
      total: mapped.length,
      byStage,
    },
  });
}
