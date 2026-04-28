import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { getUserFromRequest, unauthorizedResponse, getClientIp } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.userRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = getClientIp(request);
  const { limited, retryAfterMs } = await rateLimit(`admin-assign-county:${ip}`, 10, 60_000);
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((retryAfterMs ?? 60_000) / 1000)) } }
    );
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const countyId = typeof body?.countyId === "string" ? body.countyId : null;
  if (!countyId) {
    return NextResponse.json({ error: "countyId required" }, { status: 400 });
  }

  const [applicant, county] = await Promise.all([
    prisma.applicant.findUnique({
      where: { id },
      select: { id: true, role: true },
    }),
    prisma.county.findUnique({
      where: { id: countyId },
      select: { id: true, slug: true, active: true },
    }),
  ]);
  if (!applicant) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (applicant.role !== "COUNTY_REP") {
    return NextResponse.json(
      { error: "County assignments only apply to COUNTY_REP users" },
      { status: 400 }
    );
  }
  if (!county || !county.active) {
    return NextResponse.json({ error: "County not found" }, { status: 404 });
  }

  try {
    await prisma.$transaction([
      prisma.userCounty.create({
        data: { applicantId: id, countyId },
      }),
      prisma.applicant.update({
        where: { id },
        data: { tokenVersion: { increment: 1 } },
      }),
      prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: "ADMIN_ASSIGN_USER_COUNTY",
          targetId: id,
          ipAddress: ip,
          countyId,
          metadata: { countySlug: county.slug },
        },
      }),
    ]);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Idempotent: already assigned
      return NextResponse.json({ ok: true, alreadyAssigned: true });
    }
    console.error("Failed to assign county:", err);
    return NextResponse.json({ error: "Failed to assign county" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
