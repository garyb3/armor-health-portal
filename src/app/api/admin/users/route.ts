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
  const limit = Math.min(
    parseInt(request.nextUrl.searchParams.get("limit") || "200"),
    500
  );
  const skip = parseInt(request.nextUrl.searchParams.get("skip") || "0") || 0;

  const where =
    filter === "pending"
      ? { role: { in: ["HR" as const, "ADMIN" as const] }, approved: false, denied: { not: true } }
      : { denied: { not: true } };

  const [users, total] = await Promise.all([
    prisma.applicant.findMany({
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
      take: limit,
      skip,
    }),
    prisma.applicant.count({ where }),
  ]);

  const response = NextResponse.json({
    users: users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    })),
    total,
  });
  response.headers.set("Cache-Control", "private, max-age=300");
  return response;
}
