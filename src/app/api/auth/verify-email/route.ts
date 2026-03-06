import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/verify-email?error=missing-token", request.url));
  }

  try {
    const applicant = await prisma.applicant.findUnique({
      where: { verificationToken: token },
    });

    if (!applicant) {
      return NextResponse.redirect(new URL("/verify-email?error=invalid-token", request.url));
    }

    // Mark email as verified and clear token
    await prisma.applicant.update({
      where: { id: applicant.id },
      data: {
        emailVerified: true,
        verificationToken: null,
      },
    });

    // Issue a fresh JWT with emailVerified: true
    const jwt = await createToken({
      sub: applicant.id,
      email: applicant.email,
      firstName: applicant.firstName,
      lastName: applicant.lastName,
      role: applicant.role,
      approved: applicant.approved,
      emailVerified: true,
    });

    // Determine redirect based on role
    const role = applicant.role;
    const approved = applicant.approved;
    let redirectPath = "/onboarding";

    if (role === "COUNTY_REPRESENTATIVE") {
      redirectPath = "/registration-complete";
    } else if (["RECRUITER", "HR"].includes(role) && !approved) {
      redirectPath = "/pending-approval";
    } else if (["RECRUITER", "HR", "ADMIN"].includes(role)) {
      redirectPath = "/dashboard";
    }

    const response = NextResponse.redirect(new URL(redirectPath, request.url));
    response.cookies.set("auth-token", jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.redirect(new URL("/verify-email?error=server-error", request.url));
  }
}
