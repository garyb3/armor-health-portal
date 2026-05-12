import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword, createToken, createRefreshToken, ACCESS_COOKIE_OPTIONS, REFRESH_COOKIE_OPTIONS } from "@/lib/auth";
import { registerSchema } from "@/schemas/auth";
import type { Role } from "@/types";
import { sendPendingApprovalEmail, sendVerificationEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp, hashToken, parseJsonBody } from "@/lib/api-helpers";
import { toCountySlug } from "@/lib/counties";

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

    const body = await parseJsonBody(request);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Destructure only safe fields — `role` from the request body is intentionally ignored.
    // Role is determined exclusively by the invite token (registration is invite-only).
    const { email: rawEmail, password, firstName, lastName, phone, inviteToken } = parsed.data;
    const email = rawEmail.trim().toLowerCase();

    // Registration requires an invite token — self-registration is disabled
    if (!inviteToken) {
      return NextResponse.json({ error: "Registration requires an invite" }, { status: 400 });
    }

    // Return the same generic error for all invite failure modes (missing, used,
    // expired, email mismatch) so callers can't probe the system to enumerate
    // which invites exist or which are still active. The legitimate user
    // already received a precise message from GET /api/invites/[token].
    const INVALID_INVITE = NextResponse.json(
      { error: "This invite link is not valid" },
      { status: 400 }
    );

    const invite = await prisma.invite.findUnique({
      where: { token: hashToken(inviteToken) },
      include: { county: { select: { id: true, slug: true } } },
    });
    if (
      !invite ||
      invite.used ||
      invite.expiresAt < new Date() ||
      invite.email.toLowerCase() !== email
    ) {
      return INVALID_INVITE;
    }
    const role = invite.role;

    // COUNTY_REP invites must specify a county — that's the user's only assignment.
    if (role === "COUNTY_REP" && !invite.county?.id) {
      return NextResponse.json(
        { error: "COUNTY_REP invite is missing a county assignment" },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const needsApproval = ["HR", "ADMIN"].includes(role);
    const rawVerificationToken = randomBytes(32).toString("hex");

    // Atomic transaction: re-check invite, check existing user, create applicant,
    // create UserCounty for COUNTY_REP, mark invite used
    const applicant = await prisma.$transaction(async (tx) => {
      const freshInvite = await tx.invite.findUnique({ where: { id: invite.id } });
      if (!freshInvite || freshInvite.used) {
        throw new Error("INVITE_ALREADY_USED");
      }

      const existing = await tx.applicant.findUnique({ where: { email } });
      if (existing) {
        if (existing.denied) throw new Error("ACCOUNT_DENIED");
        throw new Error("ACCOUNT_EXISTS");
      }

      const created = await tx.applicant.create({
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

      if (role === "COUNTY_REP" && invite.county?.id) {
        await tx.userCounty.create({
          data: { applicantId: created.id, countyId: invite.county.id },
        });
      }

      await tx.invite.update({
        where: { id: invite.id },
        data: { used: true },
      });

      return created;
    });

    const countySlug = toCountySlug(invite.county?.slug);

    // Await verification email — warn user if it fails
    let emailWarning: string | undefined;
    try {
      await sendVerificationEmail({
        userName: `${firstName} ${lastName}`,
        userEmail: email,
        verificationToken: rawVerificationToken,
        countySlug,
      });
    } catch (err) {
      console.error("[Register] Failed to send verification email:", err);
      emailWarning = "Account created but verification email could not be sent. Please contact support.";
    }

    // Notify admin of new pending approval request (fire-and-forget)
    if (needsApproval) {
      sendPendingApprovalEmail({
        userName: `${firstName} ${lastName}`,
        userEmail: email,
        userRole: role,
        countySlug,
      }).catch(() => {
        // email.ts logs the failure internally; swallow here to avoid double-log
      });
    }

    if (applicant.role == null) {
      // Invite registration always assigns a role; this is an invariant violation.
      return NextResponse.json({ error: "Account is not eligible for portal access" }, { status: 500 });
    }

    const countySlugs = applicant.role === "COUNTY_REP" && invite.county?.slug
      ? [invite.county.slug]
      : [];

    const tokenPayload = {
      sub: applicant.id,
      email: applicant.email,
      firstName: applicant.firstName,
      lastName: applicant.lastName,
      role: applicant.role,
      approved: applicant.approved,
      emailVerified: applicant.emailVerified,
      tokenVersion: applicant.tokenVersion,
      countySlugs,
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
        countySlugs,
      },
      ...(emailWarning && { emailWarning }),
    });

    response.cookies.set("auth-token", token, ACCESS_COOKIE_OPTIONS);
    response.cookies.set("refresh-token", refreshToken, REFRESH_COOKIE_OPTIONS);

    return response;
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    if (err.message === "INVITE_ALREADY_USED") {
      return NextResponse.json({ error: "This invite link is not valid" }, { status: 400 });
    }
    if (err.message === "ACCOUNT_DENIED") {
      return NextResponse.json({ error: "This account is not eligible for registration" }, { status: 403 });
    }
    if (err.message === "ACCOUNT_EXISTS") {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }
    console.error("Registration error:", err.message, err.stack);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
