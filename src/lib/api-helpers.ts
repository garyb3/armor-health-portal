import { NextRequest, NextResponse } from "next/server";

export function getUserFromRequest(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  const userEmail = request.headers.get("x-user-email");
  if (!userId || !userEmail) {
    return null;
  }
  const userRole = request.headers.get("x-user-role") || "";
  return { userId, userEmail, userRole };
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function badRequestResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function stripSsnFields(data: Record<string, unknown>): Record<string, unknown> {
  const cleaned = { ...data };
  const ssnKeys = ["ssn", "socialSecurityNumber", "social_security_number", "SSN"];
  for (const key of ssnKeys) {
    if (key in cleaned) {
      delete cleaned[key];
    }
  }
  return cleaned;
}
