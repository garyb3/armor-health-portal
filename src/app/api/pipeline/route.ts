import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { FORM_STEPS } from "@/lib/constants";
import { isApprovedOrCompleted } from "@/lib/pipeline-helpers";
import type { Role, FormStatus as AppFormStatus } from "@/types";

const STAFF_ROLES: Role[] = ["RECRUITER", "HR", "ADMIN", "ADMIN_ASSISTANT"];

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
  try {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  if (!STAFF_ROLES.includes(user.userRole as Role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const search = request.nextUrl.searchParams.get("search") || "";

  const searchWhere = search
    ? {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { email: { contains: search } },
        ],
      }
    : {};

  const limit = Math.min(
    parseInt(request.nextUrl.searchParams.get("limit") || "500"),
    500
  );
  const skip = parseInt(request.nextUrl.searchParams.get("skip") || "0") || 0;

  const [applicants, total] = await Promise.all([
    prisma.applicant.findMany({
      where: { role: { notIn: STAFF_ROLES }, denied: { not: true }, ...searchWhere },
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
      take: limit,
      skip,
    }),
    prisma.applicant.count({
      where: { role: { notIn: STAFF_ROLES }, denied: { not: true }, ...searchWhere },
    }),
  ]);

  const emptySummary = () => ({ count: 0, names: [] as string[], applicants: [] as { name: string; since: string }[] });
  const byStage: Record<string, ReturnType<typeof emptySummary>> = {};
  const completedByStage: Record<string, ReturnType<typeof emptySummary>> = {};
  for (const step of FORM_STEPS) {
    byStage[step.key] = emptySummary();
    completedByStage[step.key] = emptySummary();
  }
  byStage["COMPLETED"] = emptySummary();

  const mapped = applicants.map((a) => {
    const currentStage = getCurrentStage(a.formSubmissions);
    const name = `${a.firstName} ${a.lastName}`;

    if (!byStage[currentStage]) {
      byStage[currentStage] = emptySummary();
    }
    byStage[currentStage].count++;
    byStage[currentStage].names.push(name);

    // "since" for pending = when they entered this stage.
    // Use statusChangedAt of the current stage's submission, or account createdAt if none.
    const currentSub = a.formSubmissions.find((s) => s.formType === currentStage);
    const pendingSince = currentSub
      ? currentSub.statusChangedAt.toISOString()
      : a.createdAt.toISOString();
    byStage[currentStage].applicants.push({ name, since: pendingSince });

    a.formSubmissions.forEach((s) => {
      if (
        isApprovedOrCompleted(s.status as AppFormStatus) &&
        completedByStage[s.formType]
      ) {
        completedByStage[s.formType].count++;
        completedByStage[s.formType].names.push(name);
        completedByStage[s.formType].applicants.push({
          name,
          since: s.statusChangedAt.toISOString(),
        });
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

  const response = NextResponse.json({
    applicants: mapped,
    total,
    summary: {
      total: mapped.length,
      byStage,
      completedByStage,
    },
  });
  response.headers.set("Cache-Control", "private, max-age=60");
  return response;
  } catch (error) {
    console.error("Pipeline fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
