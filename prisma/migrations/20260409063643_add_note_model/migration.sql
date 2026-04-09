-- DropIndex
DROP INDEX "api_keys_keyHash_idx";

-- DropIndex
DROP INDEX "applicants_email_idx";

-- DropIndex
DROP INDEX "invites_email_expiresAt_idx";

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notes_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "applicants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "notes_applicantId_createdAt_idx" ON "notes"("applicantId", "createdAt");

-- CreateIndex
CREATE INDEX "notes_authorId_idx" ON "notes"("authorId");

-- CreateIndex
CREATE INDEX "applicants_role_approved_idx" ON "applicants"("role", "approved");

-- CreateIndex
CREATE INDEX "applicants_role_denied_idx" ON "applicants"("role", "denied");

-- CreateIndex
CREATE INDEX "audit_logs_userId_action_createdAt_idx" ON "audit_logs"("userId", "action", "createdAt");

-- CreateIndex
CREATE INDEX "form_submissions_status_statusChangedAt_idx" ON "form_submissions"("status", "statusChangedAt");

-- CreateIndex
CREATE INDEX "form_submissions_applicantId_createdAt_idx" ON "form_submissions"("applicantId", "createdAt");

-- CreateIndex
CREATE INDEX "invites_email_used_expiresAt_idx" ON "invites"("email", "used", "expiresAt");
