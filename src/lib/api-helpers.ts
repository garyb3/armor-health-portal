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

/**
 * Extract client IP from request headers.
 * Checks x-forwarded-for (first entry) and x-real-ip before falling back to "unknown".
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/** Map of allowed MIME types to file extensions for uploads. */
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

/**
 * Derive file extension from a validated MIME type.
 * Returns null for unknown/disallowed types — callers should reject the upload.
 */
export function getExtensionFromMime(mimeType: string): string | null {
  return MIME_TO_EXT[mimeType] ?? null;
}

/** Pattern matching keys that likely contain sensitive identity data. */
const SENSITIVE_KEY_PATTERN = /ssn|social.?security|tax.?id|tin(?![a-z])/i;

/**
 * Recursively strip fields whose keys match sensitive-data patterns (SSN, tax ID, etc.).
 * Returns a deep-cleaned copy — the original object is not mutated.
 */
export function stripSsnFields(data: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      continue; // strip this field
    }
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      cleaned[key] = stripSsnFields(value as Record<string, unknown>);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}
