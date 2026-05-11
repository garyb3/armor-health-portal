import { NextRequest, NextResponse } from "next/server";
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
  const { limited, retryAfterMs } = await rateLimit(`admin-delete:${ip}`, 5, 60_000);
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((retryAfterMs ?? 60_000) / 1000)) } }
    );
  }

  const { id } = await params;
  try {
    const applicant = await prisma.applicant.findUnique({ where: { id } });
    if (!applicant) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.applicant.update({
        where: { id },
        data: { denied: true, tokenVersion: { increment: 1 } },
      }),
      prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: "ADMIN_DELETE_USER",
          targetId: id,
          ipAddress: getClientIp(request),
          countyId: applicant.countyId,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
