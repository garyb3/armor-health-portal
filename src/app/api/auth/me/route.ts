import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  const countySlugs = (request.headers.get("x-user-county-slugs") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return NextResponse.json({
    user: {
      id: user.userId,
      email: user.userEmail,
      firstName: request.headers.get("x-user-first-name") || "",
      lastName: request.headers.get("x-user-last-name") || "",
      role: request.headers.get("x-user-role") || "",
      approved: request.headers.get("x-user-approved") === "true",
      countySlugs,
    },
  });
}
