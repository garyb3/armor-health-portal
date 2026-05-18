import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE_OPTIONS,
  verifyToken,
  verifyRefreshToken,
} from "@/lib/auth";
import { getClientIp } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  // Increment tokenVersion to invalidate all existing refresh tokens. Try the
  // access cookie first; fall back to verifying the refresh cookie since
  // verifyToken now rejects refresh-type JWTs.
  const accessToken = request.cookies.get("auth-token")?.value;
  const refreshToken = request.cookies.get("refresh-token")?.value;
  const payload =
    (accessToken && (await verifyToken(accessToken))) ||
    (refreshToken && (await verifyRefreshToken(refreshToken))) ||
    null;
  if (payload?.sub) {
    // Wrap tokenVersion bump + audit in a single tx so a DB hiccup can't bump
    // the version without an audit row (or vice versa). User-deleted case still
    // falls through to the catch — the outer logout flow still clears cookies.
    try {
      await prisma.$transaction([
        prisma.applicant.update({
          where: { id: payload.sub },
          data: { tokenVersion: { increment: 1 } },
        }),
        prisma.auditLog.create({
          data: {
            userId: payload.sub,
            action: "LOGOUT",
            targetId: payload.sub,
            ipAddress: getClientIp(request),
          },
        }),
      ]);
    } catch {
      // User may have been deleted — that's fine
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("auth-token", "", { ...ACCESS_COOKIE_OPTIONS, maxAge: 0 });
  response.cookies.set("refresh-token", "", { ...REFRESH_COOKIE_OPTIONS, maxAge: 0 });
  return response;
}
