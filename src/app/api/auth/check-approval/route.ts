import { NextRequest, NextResponse } from "next/server";
import { verifyToken, createToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  if (!token) {
    return NextResponse.json({ approved: false }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ approved: false }, { status: 401 });
  }

  // Already approved in token — no DB check needed
  if (payload.approved) {
    return NextResponse.json({ approved: true });
  }

  // Token says unapproved — check DB for updated status
  const user = await prisma.applicant.findUnique({
    where: { id: payload.sub },
    select: { approved: true },
  });

  if (!user || !user.approved) {
    return NextResponse.json({ approved: false });
  }

  // User was approved since token was issued — create a fresh token
  const newToken = await createToken({
    sub: payload.sub,
    email: payload.email,
    firstName: payload.firstName,
    lastName: payload.lastName,
    role: payload.role,
    approved: true,
  });

  const response = NextResponse.json({ approved: true });
  response.cookies.set("auth-token", newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return response;
}
