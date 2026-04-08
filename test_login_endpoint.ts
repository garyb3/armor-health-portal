import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createToken, createRefreshToken, ACCESS_COOKIE_OPTIONS, REFRESH_COOKIE_OPTIONS } from "@/lib/auth";

// Simulate the login endpoint
async function POST(request: NextRequest) {
  try {
    // Simulate request body
    const body = {
      email: "ncampo@armorhealthcare.com",
      password: "AdminPassword123!",
    };

    console.log("Request body:", body);

    const { email, password } = body;

    const applicant = await prisma.applicant.findUnique({
      where: { email },
    });

    console.log("Found applicant:", !!applicant);

    // Always run bcrypt to prevent timing-based email enumeration
    const DUMMY_HASH = "$2a$12$000000000000000000000uGBylt/cBgeFaNMOVYbOcGFmigaqHvK";
    const isValid = await verifyPassword(password, applicant?.password ?? DUMMY_HASH);
    
    console.log("Password valid:", isValid);
    console.log("Condition: !applicant || !isValid =", !applicant || !isValid);

    if (!applicant || !isValid) {
      console.log("Would return: Invalid email or password");
      return { status: 401, message: "Invalid email or password" };
    }

    console.log("Would create tokens and return user");
    return { status: 200, message: "Success", email: applicant.email };
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Login error:", err.message, err.stack);
    return { status: 500, message: "Internal server error" };
  }
}

POST(null as any).then((result) => console.log("\nResult:", result));
