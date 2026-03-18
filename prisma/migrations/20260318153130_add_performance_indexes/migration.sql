-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'APPLICANT',
    "scopes" TEXT NOT NULL DEFAULT 'read',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" DATETIME,
    "lastUsedAt" DATETIME,
    "createdBy" TEXT NOT NULL,
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
    "denied" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationToken" TEXT,
    "resetToken" TEXT,
    "resetTokenExpiresAt" DATETIME,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "phone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_applicants" ("approved", "createdAt", "email", "emailVerified", "firstName", "id", "lastName", "password", "phone", "role", "tokenVersion", "updatedAt", "verificationToken") SELECT "approved", "createdAt", "email", "emailVerified", "firstName", "id", "lastName", "password", "phone", "role", "tokenVersion", "updatedAt", "verificationToken" FROM "applicants";
DROP TABLE "applicants";
ALTER TABLE "new_applicants" RENAME TO "applicants";
CREATE UNIQUE INDEX "applicants_email_key" ON "applicants"("email");
CREATE UNIQUE INDEX "applicants_verificationToken_key" ON "applicants"("verificationToken");
CREATE UNIQUE INDEX "applicants_resetToken_key" ON "applicants"("resetToken");
CREATE INDEX "applicants_email_idx" ON "applicants"("email");
CREATE INDEX "applicants_denied_idx" ON "applicants"("denied");
CREATE INDEX "applicants_role_idx" ON "applicants"("role");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_keys_keyHash_idx" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "form_submissions_applicantId_idx" ON "form_submissions"("applicantId");

-- CreateIndex
CREATE INDEX "invites_email_expiresAt_idx" ON "invites"("email", "expiresAt");
