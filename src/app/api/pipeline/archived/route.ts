import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorizedResponse, requireCountyAccess } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { FORM_STEPS } from "@/lib/constants";
import { isApprovedOrCompleted } from "@/lib/pipeline-helpers";
import type { Role, FormStatus as AppFormStatus } from "@/types";

const STAFF_ROLES: Role[] = ["HR", "ADMIN"];

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

    const countyResult = await requireCountyAccess(request, user);
    if (countyResult instanceof NextResponse) return countyResult;
    const { county } = countyResult;

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
      parseInt(request.nextUrl.searchParams.get("limit") || "500") || 500,
      500
    );
    const skip = parseInt(request.nextUrl.searchParams.get("skip") || "0") || 0;

    const [applicants, total] = await Promise.all([
      prisma.applicant.findMany({
        where: { archivedAt: { not: null }, countyId: county.id, ...searchWhere },
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
              lastAlertSentAt: true,
              stepStartedAt: true,
              stepCompletedAt: true,
              receiptFile: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: [{ archivedAt: "desc" }, { id: "asc" }],
        take: limit,
        skip,
      }),
      prisma.applicant.count({
        where: { archivedAt: { not: null }, countyId: county.id, ...searchWhere },
      }),
    ]);

    // Resolve archivedBy -> name only for the archivers referenced on this page.
    // Filter out denied users so revoked staff names don't surface.
    const archiverIds = [
      ...new Set(
        applicants
          .map((a) => a.archivedBy)
          .filter((v): v is string => !!v)
      ),
    ];
    const archivers =
      archiverIds.length === 0
        ? new Map<string, string>()
        : await prisma.applicant
            .findMany({
              where: { id: { in: archiverIds }, denied: false },
              select: { id: true, firstName: true, lastName: true },
            })
            .then(
              (users) =>
                new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]))
            );

    const mapped = applicants.map((a) => {
      const currentStage = getCurrentStage(a.formSubmissions);
      const completedCount = a.formSubmissions.filter(
        (s) => s.stepStartedAt && s.stepCompletedAt
      ).length;

      return {
        id: a.id,
        firstName: a.firstName,
        lastName: a.lastName,
        email: a.email,
        phone: a.phone,
        createdAt: a.createdAt.toISOString(),
        offerAcceptedAt: a.offerAcceptedAt?.toISOString() ?? null,
        archivedAt: a.archivedAt?.toISOString() ?? null,
        archivedBy: a.archivedBy,
        archivedByName: a.archivedBy ? archivers.get(a.archivedBy) ?? null : null,
        notes: a.notes ?? null,
        currentStage,
        completedCount,
        totalCount: FORM_STEPS.length,
        isStale: false,
        lastAlertSentAt: null,
        hasAnyReceipt: a.formSubmissions.some((s) => !!s.receiptFile),
        progress: a.formSubmissions.map((s) => ({
          formType: s.formType,
          status: s.status,
          updatedAt: s.updatedAt.toISOString(),
          statusChangedAt: s.statusChangedAt.toISOString(),
          reviewedBy: s.reviewedBy,
          reviewedAt: s.reviewedAt?.toISOString() ?? null,
          reviewNote: s.reviewNote,
          lastAlertSentAt: s.lastAlertSentAt?.toISOString() ?? null,
          stepStartedAt: s.stepStartedAt?.toISOString() ?? null,
          stepCompletedAt: s.stepCompletedAt?.toISOString() ?? null,
          hasReceipt: !!s.receiptFile,
        })),
      };
    });

    const response = NextResponse.json({ applicants: mapped, total });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    console.error("Archived pipeline fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
