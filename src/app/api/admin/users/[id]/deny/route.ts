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
  const { limited, retryAfterMs } = await rateLimit(`admin-deny:${ip}`, 10, 60_000);
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

    // Soft-deny: preserve the record for audit trail instead of hard-deleting.
    // Incrementing tokenVersion revokes any active sessions immediately.
    // Purge SensitiveData (SSN) on deny — data minimization: once a candidate
    // is denied, we no longer have a business reason to retain their SSN.
    // If compliance later requires a statutory retention window (e.g. EEOC
    // 1-year hold for federal contractors), replace this deleteMany with a
    // sensitiveDataPurgedAt field + scheduled job.
    await prisma.$transaction([
      prisma.applicant.update({
        where: { id },
        data: { approved: false, denied: true, tokenVersion: { increment: 1 } },
      }),
      prisma.sensitiveData.deleteMany({
        where: { applicantId: id },
      }),
      prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: "ADMIN_DENY_USER",
          targetId: id,
          ipAddress: getClientIp(request),
          metadata: { sensitiveDataPurged: true },
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to deny user:", error);
    return NextResponse.json({ error: "Failed to deny user" }, { status: 500 });
  }
}
