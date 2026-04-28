import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorizedResponse, getClientIp } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { FORM_STEPS } from "@/lib/constants";

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
  const { limited, retryAfterMs } = await rateLimit(`admin-reset:${ip}`, 10, 60_000);
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((retryAfterMs ?? 60_000) / 1000)) } }
    );
  }

  const { id } = await params;

  const applicant = await prisma.applicant.findUnique({ where: { id } });
  if (!applicant) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Use transaction to prevent data loss if server crashes mid-operation
  const formTypes = FORM_STEPS.map((s) => s.key);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.formSubmission.deleteMany({
        where: { applicantId: id },
      });
      for (const formType of formTypes) {
        await tx.formSubmission.create({
          data: { applicantId: id, formType, status: "NOT_STARTED" },
        });
      }
      await tx.auditLog.create({
        data: {
          userId: user.userId,
          action: "ADMIN_RESET_PIPELINE",
          targetId: id,
          ipAddress: getClientIp(request),
        },
      });
    });
  } catch (error) {
    console.error("Pipeline reset failed for applicant:", id, error);
    return NextResponse.json({ error: "Pipeline reset failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
