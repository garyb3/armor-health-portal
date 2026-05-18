import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorizedResponse, getClientIp, requireCountyAccess, assertApplicantInCounty } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { FORM_STEPS } from "@/lib/constants";

const STAFF_ROLES: string[] = ["HR", "ADMIN", "COUNTY_REP"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  if (!STAFF_ROLES.includes(user.userRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { limited, retryAfterMs } = await rateLimit(`pipeline-archive:${user.userId}`, 20, 60_000);
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((retryAfterMs ?? 60_000) / 1000)) } }
    );
  }

  const countyResult = await requireCountyAccess(request, user);
  if (countyResult instanceof NextResponse) return countyResult;
  const { county } = countyResult;

  const { id } = await params;

  const ownership = await assertApplicantInCounty(id, county.id);
  if (ownership) return ownership;

  try {
    // Re-read applicant + form submissions inside the tx so a concurrent
    // mutation (e.g. offerAcceptedAt being cleared) can't slip between the
    // eligibility checks and the archive write. Audit log lives in the same tx.
    const txResult = await prisma.$transaction(async (tx) => {
      const applicant = await tx.applicant.findUnique({
        where: { id },
        include: {
          formSubmissions: {
            select: { formType: true, stepStartedAt: true, stepCompletedAt: true },
          },
        },
      });

      if (!applicant) {
        return { status: 404, body: { error: "Applicant not found" } } as const;
      }
      if (applicant.archivedAt) {
        return { status: 409, body: { error: "Already archived" } } as const;
      }
      if (!applicant.offerAcceptedAt) {
        return { status: 409, body: { error: "Offer must be accepted before archiving" } } as const;
      }

      const completedStepTypes = new Set(
        applicant.formSubmissions
          .filter((s) => s.stepStartedAt && s.stepCompletedAt)
          .map((s) => s.formType)
      );
      const missing = FORM_STEPS.filter((step) => !completedStepTypes.has(step.key));
      if (missing.length > 0) {
        return {
          status: 409,
          body: {
            error: "All pipeline steps must have start and end dates before archiving",
            missingSteps: missing.map((s) => s.key),
          },
        } as const;
      }

      await tx.applicant.update({
        where: { id },
        data: { archivedAt: new Date(), archivedBy: user.userId },
      });
      await tx.auditLog.create({
        data: {
          userId: user.userId,
          action: "PIPELINE_ARCHIVE_CANDIDATE",
          targetId: id,
          ipAddress: getClientIp(request),
          countyId: county.id,
        },
      });
      return null;
    });

    if (txResult) return NextResponse.json(txResult.body, { status: txResult.status });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to archive applicant:", error);
    return NextResponse.json({ error: "Failed to archive applicant" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  if (!STAFF_ROLES.includes(user.userRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { limited, retryAfterMs } = await rateLimit(`pipeline-archive:${user.userId}`, 20, 60_000);
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((retryAfterMs ?? 60_000) / 1000)) } }
    );
  }

  const countyResult = await requireCountyAccess(request, user);
  if (countyResult instanceof NextResponse) return countyResult;
  const { county } = countyResult;

  const { id } = await params;

  const ownership = await assertApplicantInCounty(id, county.id);
  if (ownership) return ownership;

  try {
    // Re-read inside the tx so a concurrent mutation can't slip between the
    // eligibility re-verification and the restore write. Audit log same tx.
    const txResult = await prisma.$transaction(async (tx) => {
      const applicant = await tx.applicant.findUnique({
        where: { id },
        select: {
          id: true,
          archivedAt: true,
          offerAcceptedAt: true,
          formSubmissions: {
            select: { formType: true, stepStartedAt: true, stepCompletedAt: true },
          },
        },
      });

      if (!applicant) {
        return { status: 404, body: { error: "Applicant not found" } } as const;
      }
      if (!applicant.archivedAt) {
        return { status: 409, body: { error: "Not archived" } } as const;
      }

      // Re-verify archival eligibility before restoring — mirrors the POST
      // checks above. Prevents restore from re-introducing a candidate whose
      // offer or step completion was cleared while archived.
      if (!applicant.offerAcceptedAt) {
        return { status: 409, body: { error: "Offer must be accepted to restore from archive" } } as const;
      }
      const completedStepTypes = new Set(
        applicant.formSubmissions
          .filter((s) => s.stepStartedAt && s.stepCompletedAt)
          .map((s) => s.formType)
      );
      const missing = FORM_STEPS.filter((step) => !completedStepTypes.has(step.key));
      if (missing.length > 0) {
        return {
          status: 409,
          body: {
            error: "All pipeline steps must have start and end dates to restore from archive",
            missingSteps: missing.map((s) => s.key),
          },
        } as const;
      }

      await tx.applicant.update({
        where: { id },
        data: { archivedAt: null, archivedBy: null },
      });
      await tx.auditLog.create({
        data: {
          userId: user.userId,
          action: "PIPELINE_RESTORE_CANDIDATE",
          targetId: id,
          ipAddress: getClientIp(request),
          countyId: county.id,
        },
      });
      return null;
    });

    if (txResult) return NextResponse.json(txResult.body, { status: txResult.status });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to restore applicant:", error);
    return NextResponse.json({ error: "Failed to restore applicant" }, { status: 500 });
  }
}
