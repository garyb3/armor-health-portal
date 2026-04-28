/*
  Warnings:

  - Made the column `countyId` on table `form_submissions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `countyId` on table `invites` required. This step will fail if there are existing NULL values in that column.
  - Made the column `countyId` on table `notes` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_form_submissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicantId" TEXT NOT NULL,
    "countyId" TEXT NOT NULL,
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
    CONSTRAINT "form_submissions_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "counties" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_form_submissions" ("applicantId", "countyId", "createdAt", "formData", "formType", "id", "lastAlertSentAt", "receiptFile", "reviewNote", "reviewedAt", "reviewedBy", "status", "statusChangedAt", "stepCompletedAt", "stepStartedAt", "submittedAt", "updatedAt") SELECT "applicantId", "countyId", "createdAt", "formData", "formType", "id", "lastAlertSentAt", "receiptFile", "reviewNote", "reviewedAt", "reviewedBy", "status", "statusChangedAt", "stepCompletedAt", "stepStartedAt", "submittedAt", "updatedAt" FROM "form_submissions";
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
    "countyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invites_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "counties" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_invites" ("countyId", "createdAt", "createdBy", "email", "expiresAt", "id", "role", "token", "used") SELECT "countyId", "createdAt", "createdBy", "email", "expiresAt", "id", "role", "token", "used" FROM "invites";
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
    "countyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "notes_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "applicants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "notes_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "counties" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_notes" ("applicantId", "authorId", "authorName", "content", "countyId", "createdAt", "id", "updatedAt") SELECT "applicantId", "authorId", "authorName", "content", "countyId", "createdAt", "id", "updatedAt" FROM "notes";
DROP TABLE "notes";
ALTER TABLE "new_notes" RENAME TO "notes";
CREATE INDEX "notes_applicantId_createdAt_idx" ON "notes"("applicantId", "createdAt");
CREATE INDEX "notes_authorId_idx" ON "notes"("authorId");
CREATE INDEX "notes_countyId_idx" ON "notes"("countyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
