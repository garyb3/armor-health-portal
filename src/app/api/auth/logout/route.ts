import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  // Increment tokenVersion to invalidate all existing refresh tokens
  const token = request.cookies.get("auth-token")?.value
    || request.cookies.get("refresh-token")?.value;
  if (token) {
    const payload = await verifyToken(token);
    if (payload?.sub) {
      try {
        await prisma.applicant.update({
          where: { id: payload.sub },
          data: { tokenVersion: { increment: 1 } },
        });
      } catch {
        // User may have been deleted — that's fine
      }
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("auth-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  response.cookies.set("refresh-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  return response;
}
