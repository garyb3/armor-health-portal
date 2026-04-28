import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createToken, createRefreshToken, ACCESS_COOKIE_OPTIONS, REFRESH_COOKIE_OPTIONS } from "@/lib/auth";
import { loginSchema } from "@/schemas/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/api-helpers";

// Pre-computed bcrypt hash used to burn CPU time when the user doesn't exist,
// preventing timing-based email enumeration.
const DUMMY_HASH = "$2a$12$000000000000000000000uGBylt/cBgeFaNMOVYbOcGFmigaqHvK";

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 login attempts per minute per IP
    const ip = getClientIp(request);
    const { limited, retryAfterMs } = await rateLimit(`login:${ip}`, 5, 60_000);
    if (limited) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((retryAfterMs || 60_000) / 1000)) } }
      );
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // SQLite-safe case-insensitive email lookup.
    // Prisma's `mode: "insensitive"` is Postgres/Mongo only — not valid on SQLite.
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM applicants WHERE LOWER(email) = LOWER(${email}) LIMIT 1
    `;
    const applicant = rows[0]
      ? await prisma.applicant.findUnique({
          where: { id: rows[0].id },
          include: {
            userCounties: { include: { county: { select: { slug: true } } } },
          },
        })
      : null;

    // Always run bcrypt to prevent timing-based email enumeration
    const isValid = await verifyPassword(password, applicant?.password ?? DUMMY_HASH);
    if (!applicant || !isValid || applicant.role == null) {
      // null-role rows are candidate data records (no portal access) — same generic
      // error so we don't leak that the row exists.
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const countySlugs = applicant.role === "COUNTY_REP"
      ? applicant.userCounties.map((uc) => uc.county.slug)
      : [];

    const tokenPayload = {
      sub: applicant.id,
      email: applicant.email,
      firstName: applicant.firstName,
      lastName: applicant.lastName,
      role: applicant.role,
      approved: applicant.approved,
      emailVerified: applicant.emailVerified,
      tokenVersion: applicant.tokenVersion,
      countySlugs,
    };

    const [token, refreshToken] = await Promise.all([
      createToken(tokenPayload),
      createRefreshToken(tokenPayload),
    ]);

    const response = NextResponse.json({
      user: {
        id: applicant.id,
        email: applicant.email,
        firstName: applicant.firstName,
        lastName: applicant.lastName,
        role: applicant.role,
        phone: applicant.phone,
        approved: applicant.approved,
        emailVerified: applicant.emailVerified,
        countySlugs,
      },
    });

    response.cookies.set("auth-token", token, ACCESS_COOKIE_OPTIONS);
    response.cookies.set("refresh-token", refreshToken, REFRESH_COOKIE_OPTIONS);

    return response;
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Login error:", err.message, err.stack);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
