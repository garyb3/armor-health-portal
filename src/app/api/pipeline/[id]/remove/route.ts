import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorizedResponse, getClientIp, requireCountyAccess, assertApplicantInCounty } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

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

  const { limited, retryAfterMs } = await rateLimit(`pipeline-remove:${user.userId}`, 20, 60_000);
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
    await prisma.$transaction([
      prisma.applicant.update({
        where: { id },
        data: { denied: true },
      }),
      // Match /admin/users/[id]/deny + /delete: purge SSN on denial. Same data-minimization
      // rationale, more-exposed endpoint (HR/ADMIN/COUNTY_REP, not ADMIN-only).
      prisma.sensitiveData.deleteMany({ where: { applicantId: id } }),
      prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: "PIPELINE_REMOVE_CANDIDATE",
          targetId: id,
          ipAddress: getClientIp(request),
          countyId: county.id,
          metadata: { sensitiveDataPurged: true },
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove candidate:", error);
    return NextResponse.json({ error: "Failed to remove candidate" }, { status: 500 });
  }
}
