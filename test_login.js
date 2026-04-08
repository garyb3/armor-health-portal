const { PrismaClient } = require("@prisma/client");
const { PrismaLibSql } = require("@prisma/adapter-libsql");
const bcrypt = require("bcryptjs");

const adapter = new PrismaLibSql({
  url: "file:./prisma/dev.db",
});

const prisma = new PrismaClient({ adapter });

async function test() {
  console.log("=== Testing Login Flow ===\n");
  
  const email = "ncampo@armorhealthcare.com";
  const password = "AdminPassword123!";
  
  // 1. Look up user
  const applicant = await prisma.applicant.findUnique({
    where: { email },
  });
  
  if (!applicant) {
    console.log("ERROR: User not found in database");
    process.exit(1);
  }
  
  console.log("User found:");
  console.log("  Email:", applicant.email);
  console.log("  Password hash from DB:", applicant.password);
  console.log("  Hash length:", applicant.password.length);
  console.log("  Hash starts with $2b:", applicant.password.startsWith("$2b"));
  
  // 2. Verify password
  const isValid = await bcrypt.compare(password, applicant.password);
  console.log("\nPassword verification result:", isValid);
  
  if (!isValid) {
    console.log("\nERROR: Password does not match!");
    console.log("Attempted password:", password);
    
    // Try hashing fresh to see if there's a difference
    const freshHash = await bcrypt.hash(password, 12);
    const freshMatch = await bcrypt.compare(password, freshHash);
    console.log("\nFresh hash test:");
    console.log("  Fresh hash:", freshHash);
    console.log("  Fresh hash matches?", freshMatch);
  } else {
    console.log("\nSUCCESS: Password matches!");
  }
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
