import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";

async function test() {
  console.log("=== Testing Full Login Logic ===\n");
  
  const email = "ncampo@armorhealthcare.com";
  const password = "AdminPassword123!";
  
  console.log("1. Looking up user with email:", email);
  const applicant = await prisma.applicant.findUnique({
    where: { email },
  });
  
  if (!applicant) {
    console.log("   ERROR: User not found");
    return;
  }
  console.log("   Found user:", applicant.email);
  
  console.log("\n2. Verifying password...");
  const DUMMY_HASH = "$2a$12$000000000000000000000uGBylt/cBgeFaNMOVYbOcGFmigaqHvK";
  const isValid = await verifyPassword(password, applicant.password ?? DUMMY_HASH);
  console.log("   Password verification result:", isValid);
  
  console.log("\n3. Full condition check:");
  console.log("   applicant exists:", !!applicant);
  console.log("   password is valid:", isValid);
  console.log("   (!applicant || !isValid):", !applicant || !isValid);
  
  if (!applicant || !isValid) {
    console.log("   ERROR: Would return 'Invalid email or password'");
  } else {
    console.log("   SUCCESS: Would proceed with token creation");
  }
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
