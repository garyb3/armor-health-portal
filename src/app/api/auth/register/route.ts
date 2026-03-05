import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createToken } from "@/lib/auth";
import { registerSchema } from "@/schemas/auth";
import type { Role } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password, firstName, lastName, phone, inviteToken } = parsed.data;

    // Determine role: from invite or forced to APPLICANT
    let role: string = "APPLICANT";
    let invite = null;

    if (inviteToken) {
      invite = await prisma.invite.findUnique({ where: { token: inviteToken } });
      if (!invite) {
        return NextResponse.json({ error: "Invalid invite" }, { status: 400 });
      }
      if (invite.used) {
        return NextResponse.json({ error: "Invite already used" }, { status: 400 });
      }
      if (invite.expiresAt < new Date()) {
        return NextResponse.json({ error: "Invite expired" }, { status: 400 });
      }
      if (invite.email.toLowerCase() !== email.toLowerCase()) {
        return NextResponse.json(
          { error: "Email does not match invite" },
          { status: 400 }
        );
      }
      role = invite.role;
    }

    const existing = await prisma.applicant.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const applicant = await prisma.applicant.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: role as Role,
        phone: phone || null,
      },
    });

    // Only create form submissions for applicants (staff don't onboard)
    if (role === "APPLICANT") {
      await prisma.formSubmission.createMany({
        data: [
          { applicantId: applicant.id, formType: "DRUG_SCREEN", status: "NOT_STARTED" },
          { applicantId: applicant.id, formType: "BACKGROUND_CHECK", status: "NOT_STARTED" },
          { applicantId: applicant.id, formType: "WEB_CHECK", status: "NOT_STARTED" },
        ],
      });
    }

    // Mark invite as used
    if (invite) {
      await prisma.invite.update({
        where: { id: invite.id },
        data: { used: true },
      });
    }

    const token = await createToken({
      sub: applicant.id,
      email: applicant.email,
      firstName: applicant.firstName,
      lastName: applicant.lastName,
      role: applicant.role,
    });

    const response = NextResponse.json({
      user: {
        id: applicant.id,
        email: applicant.email,
        firstName: applicant.firstName,
        lastName: applicant.lastName,
        role: applicant.role,
        phone: applicant.phone,
      },
    });

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
