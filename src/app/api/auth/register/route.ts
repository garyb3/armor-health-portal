import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword, createToken, createRefreshToken, ACCESS_COOKIE_OPTIONS, REFRESH_COOKIE_OPTIONS } from "@/lib/auth";
import { registerSchema } from "@/schemas/auth";
import type { Role } from "@/types";
import { sendPendingApprovalEmail, sendVerificationEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp, hashToken } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 3 registration attempts per minute per IP
    const ip = getClientIp(request);
    const { limited, retryAfterMs } = await rateLimit(`register:${ip}`, 3, 60_000);
    if (limited) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((retryAfterMs || 60_000) / 1000)) } }
      );
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Destructure only safe fields — `role` from the request body is intentionally ignored.
    // Role is determined exclusively by invite token (if present) or defaults to APPLICANT.
    const { email, password, firstName, lastName, phone, inviteToken } = parsed.data;

    let role: string = "APPLICANT";
    let invite = null;

    if (inviteToken) {
      invite = await prisma.invite.findUnique({ where: { token: hashToken(inviteToken) } });
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
      // Denied accounts cannot re-register (use generic message to avoid enumeration)
      if (existing.denied) {
        return NextResponse.json(
          { error: "This account is not eligible for registration" },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const needsApproval = ["RECRUITER", "HR", "ADMIN_ASSISTANT", "ADMIN"].includes(role);
    const rawVerificationToken = randomBytes(32).toString("hex");
    const applicant = await prisma.applicant.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: role as Role,
        approved: !needsApproval,
        emailVerified: false,
        verificationToken: hashToken(rawVerificationToken),
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
      verificationToken: rawVerificationToken,
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

    const tokenPayload = {
      sub: applicant.id,
      email: applicant.email,
      firstName: applicant.firstName,
      lastName: applicant.lastName,
      role: applicant.role,
      approved: applicant.approved,
      emailVerified: applicant.emailVerified,
      tokenVersion: applicant.tokenVersion,
    };

    const [token, refreshToken] = await Promise.all([
      createToken(tokenPayload),
      createRefreshToken(tokenPayload),
    ]);

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

    response.cookies.set("auth-token", token, ACCESS_COOKIE_OPTIONS);
    response.cookies.set("refresh-token", refreshToken, REFRESH_COOKIE_OPTIONS);

    return response;
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Registration error:", err.message, err.stack);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
