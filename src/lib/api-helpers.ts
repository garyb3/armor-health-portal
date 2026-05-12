import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "./prisma";
import { isValidCountySlug } from "./counties";
import { canAccessCounty } from "./auth-county";

/**
 * Hash a token with SHA-256 for safe database storage.
 * Raw tokens are sent to users via email; only the hash is persisted.
 * On lookup, hash the incoming token and compare against the stored hash.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getUserFromRequest(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  const userEmail = request.headers.get("x-user-email");
  if (!userId || !userEmail) {
    return null;
  }
  const userRole = request.headers.get("x-user-role") || "";
  const userFirstName = request.headers.get("x-user-first-name") || "";
  const userLastName = request.headers.get("x-user-last-name") || "";
  return { userId, userEmail, userRole, userFirstName, userLastName };
}

/**
 * Resolve the active county for a request and verify the caller can access it.
 *
 * The slug comes from the `x-county-slug` header (set by middleware after extracting
 * it from /[county]/* page URLs or from the inbound apiFetch header for /api/* calls)
 * unless an `explicitSlug` is provided (e.g. for cron / API-key callers that pass it
 * via body or query).
 *
 * Authorization is delegated to canAccessCounty: HR/ADMIN are global tenants and
 * pass; COUNTY_REP must have the slug in their `x-user-county-slugs` claim (set
 * by middleware from the verified JWT and stripped from inbound requests). This
 * is defense in depth — middleware also gates COUNTY_REP at the page/API boundary.
 */
export async function requireCountyAccess(
  request: NextRequest,
  user: { userRole: string },
  explicitSlug?: string
) {
  const slug = (explicitSlug ?? request.headers.get("x-county-slug") ?? "").toLowerCase();
  if (!slug || !isValidCountySlug(slug)) {
    return NextResponse.json({ error: "County required" }, { status: 400 });
  }
  const county = await prisma.county.findUnique({
    where: { slug },
    select: { id: true, slug: true, displayName: true, active: true },
  });
  if (!county || !county.active) {
    return NextResponse.json({ error: "County not found" }, { status: 404 });
  }
  const userCountySlugs = (request.headers.get("x-user-county-slugs") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!canAccessCounty(user.userRole, userCountySlugs, slug)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { county };
}

/**
 * Confirm an applicant (candidate) row belongs to the given county. Returns null
 * when the check passes, or a 404 NextResponse otherwise — same status as a missing
 * row so we don't leak existence across tenants.
 */
export async function assertApplicantInCounty(applicantId: string, countyId: string) {
  const a = await prisma.applicant.findUnique({
    where: { id: applicantId },
    select: { countyId: true },
  });
  if (!a || a.countyId !== countyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function badRequestResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

/**
 * Parse a request's JSON body, returning null on parse failure so the caller
 * can issue a 400 instead of letting the SyntaxError bubble into a 500.
 * Returns `any` to match the ergonomics of `await request.json()` it replaces.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function parseJsonBody(request: NextRequest): Promise<any | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * Parse an optional ISO date from a JSON request body.
 * Returns a Date for valid strings, null for null/undefined/empty, or "invalid" for garbage.
 * Callers must check for "invalid" and return a 400 — `new Date("garbage")` silently returns Invalid Date.
 */
export function parseOptionalDate(value: unknown): Date | null | "invalid" {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return "invalid";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "invalid";
  return d;
}

/**
 * Reject oversized request bodies before parsing. Returns a 413 response if
 * Content-Length is present and exceeds the limit, otherwise null. Doesn't
 * guard against clients that omit Content-Length or stream — call sites
 * should still bound their inputs (content .length check, Zod refine, etc.).
 */
export function enforceMaxBodySize(request: NextRequest, maxBytes: number) {
  const len = Number(request.headers.get("content-length") ?? 0);
  if (len > maxBytes) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  return null;
}

/** Basic IPv4/IPv6 format check to reject obviously spoofed values. */
const IP_PATTERN = /^[\d.]+$|^[a-fA-F\d:]+$/;

/**
 * Extract client IP from request headers.
 * IMPORTANT: In production, your reverse proxy (Vercel, nginx, etc.) MUST overwrite
 * x-forwarded-for and x-real-ip headers — otherwise clients can spoof their IP to
 * bypass rate limits. Only trust these headers behind a proxy that strips client values.
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded && IP_PATTERN.test(forwarded)) return forwarded;

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp && IP_PATTERN.test(realIp)) return realIp;

  return "unknown";
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
