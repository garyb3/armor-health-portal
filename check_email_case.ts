import { prisma } from "@/lib/prisma";

async function test() {
  // Check with exact case
  const exact = await prisma.applicant.findUnique({
    where: { email: "ncampo@armorhealthcare.com" },
  });
  console.log("Exact match (ncampo@armorhealthcare.com):", !!exact, exact?.email);
  
  // Check with different cases
  const upper = await prisma.applicant.findUnique({
    where: { email: "NCAMPO@ARMORHEALTHCARE.COM" },
  });
  console.log("Upper case match:", !!upper);
  
  const lower = await prisma.applicant.findUnique({
    where: { email: "ncampo@armorhealthcare.com" },
  });
  console.log("Lower case match:", !!lower, lower?.email);
  
  // Get all admin/HR users
  const admins = await prisma.applicant.findMany({
    where: { role: { in: ["ADMIN", "HR"] } },
  });
  console.log("\nAll ADMIN/HR users:");
  admins.forEach(a => console.log("  -", a.email));
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
