import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function test() {
  console.log("=== Testing Case Sensitivity Issue ===\n");
  
  const passwords = ["AdminPassword123!", "adminpassword123!"];
  const emails = [
    "ncampo@armorhealthcare.com",
    "NCAMPO@ARMORHEALTHCARE.COM",
    "Ncampo@Armorhealthcare.Com",
    "nCampo@ArmorHealthcare.com"
  ];
  
  for (const email of emails) {
    console.log(`\nTrying email: "${email}"`);
    const applicant = await prisma.applicant.findUnique({
      where: { email },
    });
    
    if (!applicant) {
      console.log("  Result: NOT FOUND - Login will fail!");
    } else {
      console.log("  Result: Found!");
      for (const pwd of passwords) {
        const match = await bcrypt.compare(pwd, applicant.password);
        console.log(`    Password "${pwd}": ${match ? "MATCH" : "NO MATCH"}`);
      }
    }
  }
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
