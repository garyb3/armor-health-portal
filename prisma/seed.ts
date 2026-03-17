import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

type FormType = "VOLUNTEER_APP" | "PROFESSIONAL_LICENSE" | "DRUG_SCREEN" | "BACKGROUND_CHECK";
type FormStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "PENDING_REVIEW" | "APPROVED" | "DENIED";

interface DummyApplicant {
  firstName: string;
  lastName: string;
  email: string;
  submissions: { formType: FormType; status: FormStatus }[];
}

const DUMMY_APPLICANTS: DummyApplicant[] = [
  // Stage 1: Currently on VOLUNTEER_APP
  { firstName: "Maria", lastName: "Gonzalez", email: "maria.gonzalez@example.com", submissions: [
    { formType: "VOLUNTEER_APP", status: "IN_PROGRESS" },
  ]},
  { firstName: "James", lastName: "Wilson", email: "james.wilson@example.com", submissions: [
    { formType: "VOLUNTEER_APP", status: "PENDING_REVIEW" },
  ]},
  { firstName: "Aisha", lastName: "Patel", email: "aisha.patel@example.com", submissions: [
    { formType: "VOLUNTEER_APP", status: "IN_PROGRESS" },
  ]},

  // Stage 2: Currently on PROFESSIONAL_LICENSE (step 1 approved)
  { firstName: "Robert", lastName: "Chen", email: "robert.chen@example.com", submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "IN_PROGRESS" },
  ]},
  { firstName: "Tanya", lastName: "Brooks", email: "tanya.brooks@example.com", submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "PENDING_REVIEW" },
  ]},

  // Stage 3: Currently on DRUG_SCREEN (steps 1-2 approved)
  { firstName: "Derek", lastName: "Johnson", email: "derek.johnson@example.com", submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "PENDING_REVIEW" },
  ]},
  { firstName: "Linda", lastName: "Nguyen", email: "linda.nguyen@example.com", submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "IN_PROGRESS" },
  ]},
  { firstName: "Marcus", lastName: "Taylor", email: "marcus.taylor@example.com", submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "PENDING_REVIEW" },
  ]},
  { firstName: "Sarah", lastName: "Kim", email: "sarah.kim@example.com", submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "IN_PROGRESS" },
  ]},

  // Stage 4: Currently on BACKGROUND_CHECK (steps 1-3 approved)
  { firstName: "Kevin", lastName: "Davis", email: "kevin.davis@example.com", submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "PENDING_REVIEW" },
  ]},
  { firstName: "Rachel", lastName: "Moore", email: "rachel.moore@example.com", submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "IN_PROGRESS" },
  ]},

  // Completed: All 4 steps approved
  { firstName: "Anthony", lastName: "Harris", email: "anthony.harris@example.com", submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "APPROVED" },
  ]},
  { firstName: "Jessica", lastName: "Lee", email: "jessica.lee@example.com", submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "APPROVED" },
  ]},

  // Denied on a step
  { firstName: "Brian", lastName: "Clark", email: "brian.clark@example.com", submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "DENIED" },
  ]},

  // Extra people in early stages
  { firstName: "Natalie", lastName: "Wright", email: "natalie.wright@example.com", submissions: [
    { formType: "VOLUNTEER_APP", status: "PENDING_REVIEW" },
  ]},
  { firstName: "Carlos", lastName: "Rivera", email: "carlos.rivera@example.com", submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "IN_PROGRESS" },
  ]},
  { firstName: "Emily", lastName: "Thomas", email: "emily.thomas@example.com", submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "PENDING_REVIEW" },
  ]},
  { firstName: "Daniel", lastName: "Martinez", email: "daniel.martinez@example.com", submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "PENDING_REVIEW" },
  ]},
];

async function main() {
  // --- Admin user ---
  const email = process.env.ADMIN_EMAIL || "ncampo@armorhealthcare.com";
  const password = process.env.ADMIN_PASSWORD || "AdminPassword123!";

  const existing = await prisma.applicant.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== "ADMIN" || !existing.approved || !existing.emailVerified) {
      await prisma.applicant.update({
        where: { email },
        data: { role: "ADMIN", approved: true, emailVerified: true },
      });
      console.log(`Updated existing user ${email} to ADMIN role.`);
    } else {
      console.log("Admin already exists, skipping admin seed.");
    }
  } else {
    const hashed = await bcrypt.hash(password, 12);
    await prisma.applicant.create({
      data: {
        email,
        password: hashed,
        firstName: "System",
        lastName: "Admin",
        role: "ADMIN",
        approved: true,
        emailVerified: true,
      },
    });
    console.log(`Admin created: ${email}`);
  }

  // --- Dummy applicants ---
  const dummyPassword = await bcrypt.hash("TestPassword123!", 12);

  for (const applicant of DUMMY_APPLICANTS) {
    const existingApplicant = await prisma.applicant.findUnique({
      where: { email: applicant.email },
    });

    if (existingApplicant) {
      console.log(`Skipping ${applicant.email} (already exists)`);
      continue;
    }

    const created = await prisma.applicant.create({
      data: {
        email: applicant.email,
        password: dummyPassword,
        firstName: applicant.firstName,
        lastName: applicant.lastName,
        role: "APPLICANT",
        approved: true,
        emailVerified: true,
      },
    });

    for (const sub of applicant.submissions) {
      await prisma.formSubmission.create({
        data: {
          applicantId: created.id,
          formType: sub.formType,
          status: sub.status,
          submittedAt: sub.status !== "NOT_STARTED" && sub.status !== "IN_PROGRESS" ? new Date() : null,
          statusChangedAt: new Date(Date.now() - Math.random() * 72 * 60 * 60 * 1000), // random 0-72h ago
        },
      });
    }

    console.log(`Created applicant: ${applicant.firstName} ${applicant.lastName} (${applicant.email})`);
  }

  console.log("\nSeed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
