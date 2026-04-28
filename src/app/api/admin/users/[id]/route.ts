import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();
  if (user.userRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const [applicant, allCounties] = await Promise.all([
    prisma.applicant.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        approved: true,
        emailVerified: true,
        denied: true,
        createdAt: true,
        userCounties: {
          select: { county: { select: { id: true, slug: true, displayName: true } } },
        },
      },
    }),
    prisma.county.findMany({
      where: { active: true },
      select: { id: true, slug: true, displayName: true },
      orderBy: { displayName: "asc" },
    }),
  ]);

  if (!applicant) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const response = NextResponse.json({
    user: {
      id: applicant.id,
      email: applicant.email,
      firstName: applicant.firstName,
      lastName: applicant.lastName,
      role: applicant.role,
      approved: applicant.approved,
      emailVerified: applicant.emailVerified,
      denied: applicant.denied,
      createdAt: applicant.createdAt.toISOString(),
      counties: applicant.userCounties.map((uc) => uc.county),
    },
    allCounties,
  });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
