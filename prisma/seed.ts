import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL || "ncampo@armorhealthcare.com";
  const password = process.env.ADMIN_PASSWORD || "AdminPassword123!";

  const existing = await prisma.applicant.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== "ADMIN" || !existing.approved) {
      await prisma.applicant.update({
        where: { email },
        data: { role: "ADMIN", approved: true },
      });
      console.log(`Updated existing user ${email} to ADMIN role.`);
    } else {
      console.log("Admin already exists, skipping seed.");
    }
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  await prisma.applicant.create({
    data: {
      email,
      password: hashed,
      firstName: "System",
      lastName: "Admin",
      role: "ADMIN",
      approved: true,
    },
  });
  console.log(`Admin created: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
