import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorizedResponse, parseOptionalDate, requireCountyAccess, getClientIp, parseJsonBody, enforceMaxBodySize } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { FORM_STEPS } from "@/lib/constants";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

// COUNTY_REP allowed: requireCountyAccess enforces tenant scoping on the assigned countyId.
const STAFF_ROLES: string[] = ["HR", "ADMIN", "COUNTY_REP"];

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    if (!STAFF_ROLES.includes(user.userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { limited, retryAfterMs } = await rateLimit(`pipeline-add:${user.userId}`, 20, 60_000);
    if (limited) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((retryAfterMs ?? 60_000) / 1000)) } }
      );
    }

    const tooLarge = enforceMaxBodySize(request, 8 * 1024);
    if (tooLarge) return tooLarge;

    const countyResult = await requireCountyAccess(request, user);
    if (countyResult instanceof NextResponse) return countyResult;
    const { county } = countyResult;

    const body = await parseJsonBody(request);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = body.phone ? String(body.phone).trim() : null;
    const offerAcceptedAt = parseOptionalDate(body.offerAcceptedAt);

    if (offerAcceptedAt === "invalid") {
      return NextResponse.json(
        { error: "Invalid offerAcceptedAt" },
        { status: 400 }
      );
    }
    if (offerAcceptedAt && offerAcceptedAt.getTime() > Date.now()) {
      return NextResponse.json(
        { error: "offerAcceptedAt cannot be in the future" },
        { status: 400 }
      );
    }

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    // Length caps prevent adversarial bloat (SQLite TEXT has no implicit limit).
    if (firstName.length > 100 || lastName.length > 100) {
      return NextResponse.json(
        { error: "First name and last name must be 100 characters or fewer" },
        { status: 400 }
      );
    }
    if (phone && phone.length > 32) {
      return NextResponse.json(
        { error: "Phone must be 32 characters or fewer" },
        { status: 400 }
      );
    }

    // RFC 5321: max email length is 254 characters.
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 }
      );
    }

    // Pre-check for duplicate email — gives a clean 409 on the happy-path collision.
    // The P2002 catch below still handles the true race (two concurrent adds).
    const existing = await prisma.applicant.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A candidate with this email already exists" },
        { status: 409 }
      );
    }

    // Generate a random password hash — candidates don't log in
    const placeholder = randomBytes(32).toString("hex");
    const hashedPassword = await bcrypt.hash(placeholder, 10);

    const applicant = await prisma.applicant.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        password: hashedPassword,
        role: null,
        approved: true,
        emailVerified: true,
        offerAcceptedAt,
        countyId: county.id,
        formSubmissions: {
          create: FORM_STEPS.map((step) => ({
            formType: step.key,
            status: "NOT_STARTED",
            statusChangedAt: new Date(),
            countyId: county.id,
          })),
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "PIPELINE_CANDIDATE_ADDED",
        targetId: applicant.id,
        ipAddress: getClientIp(request),
        countyId: county.id,
      },
    });

    return NextResponse.json({ id: applicant.id }, { status: 201 });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A candidate with this email already exists" },
        { status: 409 }
      );
    }
    console.error("Add candidate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
