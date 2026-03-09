-- AlterTable
ALTER TABLE "form_submissions" ADD COLUMN "reviewNote" TEXT;
ALTER TABLE "form_submissions" ADD COLUMN "reviewedAt" DATETIME;
ALTER TABLE "form_submissions" ADD COLUMN "reviewedBy" TEXT;

-- CreateTable
CREATE TABLE "sensitive_data" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicantId" TEXT NOT NULL,
    "encryptedSsn" TEXT NOT NULL,
    "ssnLastFour" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "sensitive_data_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "applicants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_applicants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationToken" TEXT,
    "phone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_applicants" ("approved", "createdAt", "email", "firstName", "id", "lastName", "password", "phone", "role", "updatedAt") SELECT "approved", "createdAt", "email", "firstName", "id", "lastName", "password", "phone", "role", "updatedAt" FROM "applicants";
DROP TABLE "applicants";
ALTER TABLE "new_applicants" RENAME TO "applicants";
CREATE UNIQUE INDEX "applicants_email_key" ON "applicants"("email");
CREATE UNIQUE INDEX "applicants_verificationToken_key" ON "applicants"("verificationToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "sensitive_data_applicantId_key" ON "sensitive_data"("applicantId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_targetId_idx" ON "audit_logs"("targetId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
