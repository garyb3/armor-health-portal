import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.userRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const filter = request.nextUrl.searchParams.get("filter");
  const where =
    filter === "pending"
      ? { role: { in: ["RECRUITER" as const, "HR" as const, "ADMIN_ASSISTANT" as const] }, approved: false }
      : { role: { in: ["RECRUITER" as const, "HR" as const, "ADMIN_ASSISTANT" as const, "APPLICANT" as const] } };

  const users = await prisma.applicant.findMany({
    where,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      approved: true,
      emailVerified: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    })),
  });
}
