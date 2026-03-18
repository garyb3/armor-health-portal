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
  hoursInStage: number; // how many hours ago the current stage's statusChangedAt should be
  submissions: { formType: FormType; status: FormStatus }[];
}

const DUMMY_APPLICANTS: DummyApplicant[] = [
  // Stage 1: Currently on VOLUNTEER_APP
  // Green (<12h) — just started
  { firstName: "Maria", lastName: "Gonzalez", email: "maria.gonzalez@example.com", hoursInStage: 2, submissions: [
    { formType: "VOLUNTEER_APP", status: "IN_PROGRESS" },
  ]},
  // Yellow (12-24h) — getting stale
  { firstName: "James", lastName: "Wilson", email: "james.wilson@example.com", hoursInStage: 18, submissions: [
    { formType: "VOLUNTEER_APP", status: "PENDING_REVIEW" },
  ]},
  // Red (>24h) — overdue
  { firstName: "Aisha", lastName: "Patel", email: "aisha.patel@example.com", hoursInStage: 48, submissions: [
    { formType: "VOLUNTEER_APP", status: "IN_PROGRESS" },
  ]},

  // Stage 2: Currently on PROFESSIONAL_LICENSE (step 1 approved)
  // Green — fresh
  { firstName: "Robert", lastName: "Chen", email: "robert.chen@example.com", hoursInStage: 4, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "IN_PROGRESS" },
  ]},
  // Red — overdue
  { firstName: "Tanya", lastName: "Brooks", email: "tanya.brooks@example.com", hoursInStage: 36, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "PENDING_REVIEW" },
  ]},

  // Stage 3: Currently on DRUG_SCREEN (steps 1-2 approved)
  // Red — very overdue
  { firstName: "Derek", lastName: "Johnson", email: "derek.johnson@example.com", hoursInStage: 72, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "PENDING_REVIEW" },
  ]},
  // Green — recent
  { firstName: "Linda", lastName: "Nguyen", email: "linda.nguyen@example.com", hoursInStage: 1, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "IN_PROGRESS" },
  ]},
  // Yellow — approaching overdue
  { firstName: "Marcus", lastName: "Taylor", email: "marcus.taylor@example.com", hoursInStage: 16, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "PENDING_REVIEW" },
  ]},
  // Green — just entered
  { firstName: "Sarah", lastName: "Kim", email: "sarah.kim@example.com", hoursInStage: 6, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "IN_PROGRESS" },
  ]},

  // Stage 4: Currently on BACKGROUND_CHECK (steps 1-3 approved)
  // Yellow — warning range
  { firstName: "Kevin", lastName: "Davis", email: "kevin.davis@example.com", hoursInStage: 14, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "PENDING_REVIEW" },
  ]},
  // Red — overdue
  { firstName: "Rachel", lastName: "Moore", email: "rachel.moore@example.com", hoursInStage: 30, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "IN_PROGRESS" },
  ]},

  // Completed: All 4 steps approved
  { firstName: "Anthony", lastName: "Harris", email: "anthony.harris@example.com", hoursInStage: 0, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "APPROVED" },
  ]},
  { firstName: "Jessica", lastName: "Lee", email: "jessica.lee@example.com", hoursInStage: 0, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "APPROVED" },
  ]},

  // Denied on a step
  { firstName: "Brian", lastName: "Clark", email: "brian.clark@example.com", hoursInStage: 10, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "DENIED" },
  ]},

  // Extra people in early stages
  // Red — very overdue
  { firstName: "Natalie", lastName: "Wright", email: "natalie.wright@example.com", hoursInStage: 60, submissions: [
    { formType: "VOLUNTEER_APP", status: "PENDING_REVIEW" },
  ]},
  // Yellow — warning
  { firstName: "Carlos", lastName: "Rivera", email: "carlos.rivera@example.com", hoursInStage: 20, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "IN_PROGRESS" },
  ]},
  // Green — fresh
  { firstName: "Emily", lastName: "Thomas", email: "emily.thomas@example.com", hoursInStage: 3, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "PENDING_REVIEW" },
  ]},
  // Green — recent
  { firstName: "Daniel", lastName: "Martinez", email: "daniel.martinez@example.com", hoursInStage: 8, submissions: [
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

  // --- Staff test users (Recruiter, HR, Admin Assistant) ---
  const staffPassword = await bcrypt.hash("StaffPassword123!", 12);
  const staffUsers = [
    { email: "recruiter@armorhealthcare.com", firstName: "Test", lastName: "Recruiter", role: "RECRUITER" as const },
    { email: "hr@armorhealthcare.com", firstName: "Test", lastName: "HRStaff", role: "HR" as const },
    { email: "assistant@armorhealthcare.com", firstName: "Test", lastName: "Assistant", role: "ADMIN_ASSISTANT" as const },
  ];

  for (const staff of staffUsers) {
    const existingStaff = await prisma.applicant.findUnique({ where: { email: staff.email } });
    if (existingStaff) {
      console.log(`Skipping ${staff.email} (already exists)`);
    } else {
      await prisma.applicant.create({
        data: {
          email: staff.email,
          password: staffPassword,
          firstName: staff.firstName,
          lastName: staff.lastName,
          role: staff.role,
          approved: true,
          emailVerified: true,
        },
      });
      console.log(`Created staff user: ${staff.firstName} ${staff.lastName} (${staff.email}) [${staff.role}]`);
    }
  }

  // --- Personal test account ---
  const personalExisting = await prisma.applicant.findUnique({ where: { email: "ncampo305@gmail.com" } });
  if (!personalExisting) {
    const personalPassword = await bcrypt.hash("TestPassword123!", 12);
    await prisma.applicant.create({
      data: {
        email: "ncampo305@gmail.com",
        password: personalPassword,
        firstName: "Nick",
        lastName: "Campo",
        role: "APPLICANT",
        approved: true,
        emailVerified: true,
      },
    });
    console.log("Created personal test account: ncampo305@gmail.com [APPLICANT]");
  } else {
    console.log("Skipping ncampo305@gmail.com (already exists)");
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

    for (let i = 0; i < applicant.submissions.length; i++) {
      const sub = applicant.submissions[i];
      const isCurrentStage = i === applicant.submissions.length - 1;
      // Current stage uses the explicit hoursInStage; earlier stages get a fixed older timestamp
      const hoursAgo = isCurrentStage
        ? applicant.hoursInStage
        : applicant.hoursInStage + (applicant.submissions.length - i) * 24;
      await prisma.formSubmission.create({
        data: {
          applicantId: created.id,
          formType: sub.formType,
          status: sub.status,
          submittedAt: sub.status !== "NOT_STARTED" && sub.status !== "IN_PROGRESS" ? new Date() : null,
          statusChangedAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
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
