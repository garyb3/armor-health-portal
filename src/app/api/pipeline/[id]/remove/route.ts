import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorizedResponse, getClientIp, requireCountyAccess, assertApplicantInCounty } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

const STAFF_ROLES: string[] = ["HR", "ADMIN"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  if (!STAFF_ROLES.includes(user.userRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
      prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: "PIPELINE_REMOVE_CANDIDATE",
          targetId: id,
          ipAddress: getClientIp(request),
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove candidate:", error);
    return NextResponse.json({ error: "Failed to remove candidate" }, { status: 500 });
  }
}
