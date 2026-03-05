import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { createInviteSchema } from "@/schemas/auth";

const INVITE_ROLES = ["HR", "ADMIN"];

export async function POST(request: NextRequest) {
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

  const { email, role } = parsed.data;
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite = await prisma.invite.create({
    data: {
      token,
      email,
      role,
      expiresAt,
      createdBy: user.userId,
    },
  });

  const inviteUrl = `/register/invite/${token}`;

  return NextResponse.json({
    invite: {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt.toISOString(),
      inviteUrl,
    },
  });
}
