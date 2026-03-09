import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword, createToken } from "@/lib/auth";
import { registerSchema } from "@/schemas/auth";
import type { Role } from "@/types";
import { sendPendingApprovalEmail, sendVerificationEmail } from "@/lib/email";

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

    const needsApproval = ["RECRUITER", "HR"].includes(role);
    const verificationToken = randomUUID();
    const applicant = await prisma.applicant.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: role as Role,
        approved: !needsApproval,
        emailVerified: false,
        verificationToken,
        phone: phone || null,
      },
    });

    // Only create form submissions for applicants (staff don't onboard)
    if (role === "APPLICANT") {
      const formTypes = ["VOLUNTEER_APP", "PROFESSIONAL_LICENSE", "DRUG_SCREEN", "BACKGROUND_CHECK"] as const;
      for (const formType of formTypes) {
        await prisma.formSubmission.create({
          data: { applicantId: applicant.id, formType, status: "NOT_STARTED" },
        });
      }
    }

    // Send verification email (fire-and-forget)
    sendVerificationEmail({
      userName: `${firstName} ${lastName}`,
      userEmail: email,
      verificationToken,
    }).catch((err) => console.error("[Register] Failed to send verification email:", err));

    // Notify admin of new pending approval request (fire-and-forget)
    if (needsApproval) {
      sendPendingApprovalEmail({
        userName: `${firstName} ${lastName}`,
        userEmail: email,
        userRole: role,
      }).catch((err) => console.error("[Register] Failed to send pending-approval email:", err));
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
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Registration error:", err.message, err.stack);
    return NextResponse.json(
      { error: "Internal server error", detail: err.message },
      { status: 500 }
    );
  }
}
