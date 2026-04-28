-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_applicants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT,
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
INSERT INTO "new_applicants" ("approved", "archivedAt", "archivedBy", "countyId", "createdAt", "denied", "email", "emailVerified", "firstName", "id", "lastName", "notes", "offerAcceptedAt", "password", "phone", "resetToken", "resetTokenExpiresAt", "role", "tokenVersion", "updatedAt", "verificationToken") SELECT "approved", "archivedAt", "archivedBy", "countyId", "createdAt", "denied", "email", "emailVerified", "firstName", "id", "lastName", "notes", "offerAcceptedAt", "password", "phone", "resetToken", "resetTokenExpiresAt", "role", "tokenVersion", "updatedAt", "verificationToken" FROM "applicants";
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
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

UPDATE "applicants" SET "role" = NULL WHERE "role" = 'APPLICANT';
