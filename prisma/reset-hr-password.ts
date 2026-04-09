import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const hash = await bcrypt.hash("StaffPassword123!", 12);
  await prisma.applicant.update({
    where: { email: "hr@armorhealthcare.com" },
    data: { password: hash },
  });
  console.log("Password reset for hr@armorhealthcare.com -> StaffPassword123!");

  // Also reset Nick Campo's password
  const hash2 = await bcrypt.hash("TestPassword123!", 12);
  await prisma.applicant.update({
    where: { email: "ncampo305@gmail.com" },
    data: { password: hash2 },
  });
  console.log("Password reset for ncampo305@gmail.com -> TestPassword123!");

  await prisma.$disconnect();
}

main();
