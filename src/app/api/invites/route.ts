import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getUserFromRequest, hashToken, unauthorizedResponse } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { createInviteSchema } from "@/schemas/auth";

const INVITE_ROLES = ["HR", "ADMIN"];

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    if (!INVITE_ROLES.includes(user.userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createInviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email: rawEmail, role } = parsed.data;
    const email = rawEmail.trim().toLowerCase();

    // Only ADMIN can create ADMIN invites — defense-in-depth (schema also excludes ADMIN)
    if ((role as string) === "ADMIN" && user.userRole !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can create admin invites" }, { status: 403 });
    }

    // Prevent duplicate active invites for the same email
    const existingInvite = await prisma.invite.findFirst({
      where: { email, used: false, expiresAt: { gt: new Date() } },
    });
    if (existingInvite) {
      return NextResponse.json(
        { error: "An active invite already exists for this email" },
        { status: 409 }
      );
    }

    const rawToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await prisma.invite.create({
      data: {
        token: hashToken(rawToken),
        email,
        role,
        expiresAt,
        createdBy: user.userId,
      },
    });

    const inviteUrl = `/register/invite/${rawToken}`;

    return NextResponse.json({
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt.toISOString(),
        inviteUrl,
      },
    });
  } catch (error) {
    console.error("Invite creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
