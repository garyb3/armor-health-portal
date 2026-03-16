import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // Rate limit by IP: max 10 invite lookups per minute
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
  const { limited, retryAfterMs } = await rateLimit(`invite:${ip}`, 10, 60_000);
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((retryAfterMs || 60_000) / 1000)) },
      }
    );
  }

  const { token } = await params;

  const invite = await prisma.invite.findUnique({ where: { token } });

  // Return the same generic error for invalid, used, and expired invites
  // to prevent invite token enumeration attacks.
  if (!invite || invite.used || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "This invite link is not valid" }, { status: 404 });
  }

  return NextResponse.json({
    invite: {
      email: invite.email,
      role: invite.role,
    },
  });
}
