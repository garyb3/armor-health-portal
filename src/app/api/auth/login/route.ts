import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createToken } from "@/lib/auth";
import { loginSchema } from "@/schemas/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const applicant = await prisma.applicant.findUnique({
      where: { email },
    });

    if (!applicant) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, applicant.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = await createToken({
      sub: applicant.id,
      email: applicant.email,
      firstName: applicant.firstName,
      lastName: applicant.lastName,
      role: applicant.role,
      approved: applicant.approved,
      emailVerified: applicant.emailVerified,
    });

    const response = NextResponse.json({
      user: {
        id: applicant.id,
        email: applicant.email,
        firstName: applicant.firstName,
        lastName: applicant.lastName,
        role: applicant.role,
        phone: applicant.phone,
        approved: applicant.approved,
        emailVerified: applicant.emailVerified,
      },
    });

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Login error:", err.message, err.stack);
    return NextResponse.json(
      { error: "Internal server error", detail: err.message },
      { status: 500 }
    );
  }
}
