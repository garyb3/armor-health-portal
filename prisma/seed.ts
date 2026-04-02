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
  daysInProcess: number; // how many days ago the applicant was created (controls createdAt)
  hoursInStage: number; // how many hours ago the current stage's statusChangedAt should be
  submissions: { formType: FormType; status: FormStatus }[];
}

const DUMMY_APPLICANTS: DummyApplicant[] = [
  // ============================================================
  // 1-5 DAYS IN PROCESS (majority — 13 applicants)
  // ============================================================

  // Stage 1: VOLUNTEER_APP
  { firstName: "Maria", lastName: "Gonzalez", email: "maria.gonzalez@example.com", daysInProcess: 1, hoursInStage: 6, submissions: [
    { formType: "VOLUNTEER_APP", status: "IN_PROGRESS" },
  ]},
  { firstName: "James", lastName: "Wilson", email: "james.wilson@example.com", daysInProcess: 1, hoursInStage: 10, submissions: [
    { formType: "VOLUNTEER_APP", status: "PENDING_REVIEW" },
  ]},
  { firstName: "Olivia", lastName: "Scott", email: "olivia.scott@example.com", daysInProcess: 2, hoursInStage: 4, submissions: [
    { formType: "VOLUNTEER_APP", status: "IN_PROGRESS" },
  ]},
  { firstName: "Ethan", lastName: "Reed", email: "ethan.reed@example.com", daysInProcess: 3, hoursInStage: 12, submissions: [
    { formType: "VOLUNTEER_APP", status: "PENDING_REVIEW" },
  ]},

  // Stage 2: PROFESSIONAL_LICENSE
  { firstName: "Robert", lastName: "Chen", email: "robert.chen@example.com", daysInProcess: 2, hoursInStage: 8, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "IN_PROGRESS" },
  ]},
  { firstName: "Sofia", lastName: "Ramirez", email: "sofia.ramirez@example.com", daysInProcess: 3, hoursInStage: 5, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "PENDING_REVIEW" },
  ]},
  { firstName: "Liam", lastName: "Foster", email: "liam.foster@example.com", daysInProcess: 4, hoursInStage: 14, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "IN_PROGRESS" },
  ]},

  // Stage 3: DRUG_SCREEN
  { firstName: "Linda", lastName: "Nguyen", email: "linda.nguyen@example.com", daysInProcess: 3, hoursInStage: 4, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "IN_PROGRESS" },
  ]},
  { firstName: "Sarah", lastName: "Kim", email: "sarah.kim@example.com", daysInProcess: 4, hoursInStage: 10, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "PENDING_REVIEW" },
  ]},
  { firstName: "Emily", lastName: "Thomas", email: "emily.thomas@example.com", daysInProcess: 5, hoursInStage: 6, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "IN_PROGRESS" },
  ]},

  // Stage 4: BACKGROUND_CHECK
  { firstName: "Daniel", lastName: "Martinez", email: "daniel.martinez@example.com", daysInProcess: 4, hoursInStage: 8, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "PENDING_REVIEW" },
  ]},
  { firstName: "Hannah", lastName: "White", email: "hannah.white@example.com", daysInProcess: 5, hoursInStage: 12, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "IN_PROGRESS" },
  ]},

  // Completed
  { firstName: "Anthony", lastName: "Harris", email: "anthony.harris@example.com", daysInProcess: 5, hoursInStage: 0, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "APPROVED" },
  ]},

  // ============================================================
  // 6-14 DAYS IN PROCESS (some — 5 applicants)
  // ============================================================

  // Stage 1: VOLUNTEER_APP
  { firstName: "Aisha", lastName: "Patel", email: "aisha.patel@example.com", daysInProcess: 8, hoursInStage: 48, submissions: [
    { formType: "VOLUNTEER_APP", status: "IN_PROGRESS" },
  ]},

  // Stage 2: PROFESSIONAL_LICENSE
  { firstName: "Carlos", lastName: "Rivera", email: "carlos.rivera@example.com", daysInProcess: 10, hoursInStage: 36, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "PENDING_REVIEW" },
  ]},

  // Stage 3: DRUG_SCREEN
  { firstName: "Marcus", lastName: "Taylor", email: "marcus.taylor@example.com", daysInProcess: 9, hoursInStage: 30, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "PENDING_REVIEW" },
  ]},

  // Stage 4: BACKGROUND_CHECK
  { firstName: "Kevin", lastName: "Davis", email: "kevin.davis@example.com", daysInProcess: 12, hoursInStage: 24, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "PENDING_REVIEW" },
  ]},

  // Completed
  { firstName: "Jessica", lastName: "Lee", email: "jessica.lee@example.com", daysInProcess: 11, hoursInStage: 0, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "APPROVED" },
  ]},

  // ============================================================
  // 15-30 DAYS IN PROCESS (very few — 3 applicants)
  // ============================================================

  // Stage 3: DRUG_SCREEN — stuck a long time
  { firstName: "Derek", lastName: "Johnson", email: "derek.johnson@example.com", daysInProcess: 22, hoursInStage: 192, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "PENDING_REVIEW" },
  ]},

  // Completed — took a while
  { firstName: "Rachel", lastName: "Moore", email: "rachel.moore@example.com", daysInProcess: 28, hoursInStage: 0, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "APPROVED" },
  ]},

  // Denied — failed background check after long process
  { firstName: "Brian", lastName: "Clark", email: "brian.clark@example.com", daysInProcess: 18, hoursInStage: 48, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "DENIED" },
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
        createdAt: new Date(Date.now() - applicant.daysInProcess * 86_400_000),
      },
    });

    const receiptMap: Record<string, string[]> = {
      "derek.johnson@example.com": ["DRUG_SCREEN"],
      "marcus.taylor@example.com": ["DRUG_SCREEN"],
      "kevin.davis@example.com": ["BACKGROUND_CHECK"],
      "sarah.kim@example.com": ["DRUG_SCREEN"],
    };

    for (let i = 0; i < applicant.submissions.length; i++) {
      const sub = applicant.submissions[i];
      const isCurrentStage = i === applicant.submissions.length - 1;
      // Current stage uses the explicit hoursInStage; earlier stages get a fixed older timestamp
      const hoursAgo = isCurrentStage
        ? applicant.hoursInStage
        : applicant.hoursInStage + (applicant.submissions.length - i) * 24;
      const hasReceipt = receiptMap[applicant.email]?.includes(sub.formType);
      await prisma.formSubmission.create({
        data: {
          applicantId: created.id,
          formType: sub.formType,
          status: sub.status,
          submittedAt: sub.status !== "NOT_STARTED" && sub.status !== "IN_PROGRESS" ? new Date() : null,
          statusChangedAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
          // Simulate overdue alerts for applicants stuck >24h in their current stage
          ...(isCurrentStage && applicant.hoursInStage > 24
            ? { lastAlertSentAt: new Date(Date.now() - (applicant.hoursInStage - 12) * 60 * 60 * 1000) }
            : {}),
          // Simulate receipt file uploads
          ...(hasReceipt
            ? { receiptFile: `/uploads/receipt-${sub.formType.toLowerCase()}.pdf` }
            : {}),
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
