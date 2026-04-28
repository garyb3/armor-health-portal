import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { getUserFromRequest, unauthorizedResponse, getClientIp } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; countyId: string }> }
) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.userRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = getClientIp(request);
  const { limited, retryAfterMs } = await rateLimit(`admin-unassign-county:${ip}`, 10, 60_000);
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((retryAfterMs ?? 60_000) / 1000)) } }
    );
  }

  const { id, countyId } = await params;

  const county = await prisma.county.findUnique({
    where: { id: countyId },
    select: { slug: true },
  });
  if (!county) {
    return NextResponse.json({ error: "County not found" }, { status: 404 });
  }

  try {
    await prisma.$transaction([
      prisma.userCounty.delete({
        where: { applicantId_countyId: { applicantId: id, countyId } },
      }),
      prisma.applicant.update({
        where: { id },
        data: { tokenVersion: { increment: 1 } },
      }),
      prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: "ADMIN_UNASSIGN_USER_COUNTY",
          targetId: id,
          ipAddress: ip,
          countyId,
          metadata: { countySlug: county.slug },
        },
      }),
    ]);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      // Idempotent: row already gone
      return NextResponse.json({ ok: true, alreadyUnassigned: true });
    }
    console.error("Failed to unassign county:", err);
    return NextResponse.json({ error: "Failed to unassign county" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
