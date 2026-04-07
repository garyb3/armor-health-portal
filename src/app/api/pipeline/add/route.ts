import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, unauthorizedResponse } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { FORM_STEPS } from "@/lib/constants";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const STAFF_ROLES: string[] = ["RECRUITER", "HR", "ADMIN", "ADMIN_ASSISTANT"];

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    if (!STAFF_ROLES.includes(user.userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = body.phone ? String(body.phone).trim() : null;
    const offerAcceptedAt = body.offerAcceptedAt
      ? new Date(body.offerAcceptedAt)
      : null;

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 }
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
        role: "APPLICANT",
        approved: true,
        emailVerified: true,
        offerAcceptedAt,
        formSubmissions: {
          create: FORM_STEPS.map((step) => ({
            formType: step.key,
            status: "NOT_STARTED",
            statusChangedAt: new Date(),
          })),
        },
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
