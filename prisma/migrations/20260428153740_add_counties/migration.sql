-- AlterTable
ALTER TABLE "api_keys" ADD COLUMN "countyId" TEXT;

-- CreateTable
CREATE TABLE "counties" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "user_counties" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicantId" TEXT NOT NULL,
    "countyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_counties_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "applicants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_counties_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "counties" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "denied" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationToken" TEXT,
    "resetToken" TEXT,
    "resetTokenExpiresAt" DATETIME,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "phone" TEXT,
    "offerAcceptedAt" DATETIME,
    "archivedAt" DATETIME,
    "archivedBy" TEXT,
    "notes" TEXT,
    "countyId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "applicants_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "counties" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_applicants" ("approved", "archivedAt", "archivedBy", "createdAt", "denied", "email", "emailVerified", "firstName", "id", "lastName", "notes", "offerAcceptedAt", "password", "phone", "resetToken", "resetTokenExpiresAt", "role", "tokenVersion", "updatedAt", "verificationToken") SELECT "approved", "archivedAt", "archivedBy", "createdAt", "denied", "email", "emailVerified", "firstName", "id", "lastName", "notes", "offerAcceptedAt", "password", "phone", "resetToken", "resetTokenExpiresAt", "role", "tokenVersion", "updatedAt", "verificationToken" FROM "applicants";
DROP TABLE "applicants";
ALTER TABLE "new_applicants" RENAME TO "applicants";
CREATE UNIQUE INDEX "applicants_email_key" ON "applicants"("email");
CREATE UNIQUE INDEX "applicants_verificationToken_key" ON "applicants"("verificationToken");
CREATE UNIQUE INDEX "applicants_resetToken_key" ON "applicants"("resetToken");
CREATE INDEX "applicants_denied_idx" ON "applicants"("denied");
CREATE INDEX "applicants_role_idx" ON "applicants"("role");
CREATE INDEX "applicants_approved_idx" ON "applicants"("approved");
CREATE INDEX "applicants_emailVerified_idx" ON "applicants"("emailVerified");
CREATE INDEX "applicants_role_approved_idx" ON "applicants"("role", "approved");
CREATE INDEX "applicants_role_denied_idx" ON "applicants"("role", "denied");
CREATE INDEX "applicants_archivedAt_idx" ON "applicants"("archivedAt");
CREATE INDEX "applicants_countyId_idx" ON "applicants"("countyId");
CREATE TABLE "new_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "countyId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "counties" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_audit_logs" ("action", "createdAt", "id", "ipAddress", "metadata", "targetId", "userId") SELECT "action", "createdAt", "id", "ipAddress", "metadata", "targetId", "userId" FROM "audit_logs";
DROP TABLE "audit_logs";
ALTER TABLE "new_audit_logs" RENAME TO "audit_logs";
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX "audit_logs_targetId_idx" ON "audit_logs"("targetId");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_userId_action_createdAt_idx" ON "audit_logs"("userId", "action", "createdAt");
CREATE INDEX "audit_logs_countyId_createdAt_idx" ON "audit_logs"("countyId", "createdAt");
CREATE TABLE "new_form_submissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicantId" TEXT NOT NULL,
    "countyId" TEXT,
    "formType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "formData" JSONB,
    "receiptFile" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "reviewNote" TEXT,
    "submittedAt" DATETIME,
    "statusChangedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAlertSentAt" DATETIME,
    "stepStartedAt" DATETIME,
    "stepCompletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "form_submissions_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "applicants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "form_submissions_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "counties" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_form_submissions" ("applicantId", "createdAt", "formData", "formType", "id", "lastAlertSentAt", "receiptFile", "reviewNote", "reviewedAt", "reviewedBy", "status", "statusChangedAt", "stepCompletedAt", "stepStartedAt", "submittedAt", "updatedAt") SELECT "applicantId", "createdAt", "formData", "formType", "id", "lastAlertSentAt", "receiptFile", "reviewNote", "reviewedAt", "reviewedBy", "status", "statusChangedAt", "stepCompletedAt", "stepStartedAt", "submittedAt", "updatedAt" FROM "form_submissions";
DROP TABLE "form_submissions";
ALTER TABLE "new_form_submissions" RENAME TO "form_submissions";
CREATE INDEX "form_submissions_applicantId_idx" ON "form_submissions"("applicantId");
CREATE INDEX "form_submissions_status_idx" ON "form_submissions"("status");
CREATE INDEX "form_submissions_applicantId_status_idx" ON "form_submissions"("applicantId", "status");
CREATE INDEX "form_submissions_status_statusChangedAt_idx" ON "form_submissions"("status", "statusChangedAt");
CREATE INDEX "form_submissions_applicantId_createdAt_idx" ON "form_submissions"("applicantId", "createdAt");
CREATE INDEX "form_submissions_countyId_status_idx" ON "form_submissions"("countyId", "status");
CREATE UNIQUE INDEX "form_submissions_applicantId_formType_key" ON "form_submissions"("applicantId", "formType");
CREATE TABLE "new_invites" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" DATETIME NOT NULL,
    "createdBy" TEXT NOT NULL,
    "countyId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invites_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "counties" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_invites" ("createdAt", "createdBy", "email", "expiresAt", "id", "role", "token", "used") SELECT "createdAt", "createdBy", "email", "expiresAt", "id", "role", "token", "used" FROM "invites";
DROP TABLE "invites";
ALTER TABLE "new_invites" RENAME TO "invites";
CREATE UNIQUE INDEX "invites_token_key" ON "invites"("token");
CREATE INDEX "invites_email_used_expiresAt_idx" ON "invites"("email", "used", "expiresAt");
CREATE INDEX "invites_countyId_idx" ON "invites"("countyId");
CREATE TABLE "new_notes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "countyId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "notes_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "applicants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "notes_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "counties" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_notes" ("applicantId", "authorId", "authorName", "content", "createdAt", "id", "updatedAt") SELECT "applicantId", "authorId", "authorName", "content", "createdAt", "id", "updatedAt" FROM "notes";
DROP TABLE "notes";
ALTER TABLE "new_notes" RENAME TO "notes";
CREATE INDEX "notes_applicantId_createdAt_idx" ON "notes"("applicantId", "createdAt");
CREATE INDEX "notes_authorId_idx" ON "notes"("authorId");
CREATE INDEX "notes_countyId_idx" ON "notes"("countyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "counties_slug_key" ON "counties"("slug");

-- CreateIndex
CREATE INDEX "user_counties_applicantId_idx" ON "user_counties"("applicantId");

-- CreateIndex
CREATE INDEX "user_counties_countyId_idx" ON "user_counties"("countyId");

-- CreateIndex
CREATE UNIQUE INDEX "user_counties_applicantId_countyId_key" ON "user_counties"("applicantId", "countyId");

-- Seed: Franklin County (the existing tenant). Fixed id so backfill UPDATEs can reference it.
INSERT INTO "counties" ("id", "slug", "displayName", "active", "createdAt")
VALUES ('cnty_franklin_seed', 'franklin', 'Franklin County', true, CURRENT_TIMESTAMP);

-- Backfill: every existing tenant-scoped row belongs to Franklin.
-- Applicant rows: only candidates (role=APPLICANT) get countyId; staff (HR/ADMIN) stay NULL by design.
UPDATE "applicants"        SET "countyId" = 'cnty_franklin_seed' WHERE "role" = 'APPLICANT' AND "countyId" IS NULL;
UPDATE "form_submissions"  SET "countyId" = 'cnty_franklin_seed' WHERE "countyId" IS NULL;
UPDATE "invites"           SET "countyId" = 'cnty_franklin_seed' WHERE "countyId" IS NULL;
UPDATE "notes"             SET "countyId" = 'cnty_franklin_seed' WHERE "countyId" IS NULL;
-- audit_logs intentionally left NULL: pre-multi-county logs are unambiguous historical data.
