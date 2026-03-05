import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.userRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const updated = await prisma.applicant.update({
      where: { id },
      data: { approved: true },
    });

    return NextResponse.json({
      user: { id: updated.id, email: updated.email, approved: updated.approved },
    });
  } catch (error) {
    console.error("Failed to approve user:", error);
    return NextResponse.json({ error: "Failed to approve user" }, { status: 500 });
  }
}
