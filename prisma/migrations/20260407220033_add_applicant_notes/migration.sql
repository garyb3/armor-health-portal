-- AlterTable
ALTER TABLE "applicants" ADD COLUMN "notes" TEXT;

-- AlterTable
ALTER TABLE "form_submissions" ADD COLUMN "stepCompletedAt" DATETIME;
ALTER TABLE "form_submissions" ADD COLUMN "stepStartedAt" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_api_keys" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'HR',
    "scopes" TEXT NOT NULL DEFAULT 'read',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" DATETIME,
    "lastUsedAt" DATETIME,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_api_keys" ("active", "createdAt", "createdBy", "expiresAt", "id", "keyHash", "keyPrefix", "lastUsedAt", "name", "role", "scopes") SELECT "active", "createdAt", "createdBy", "expiresAt", "id", "keyHash", "keyPrefix", "lastUsedAt", "name", "role", "scopes" FROM "api_keys";
DROP TABLE "api_keys";
ALTER TABLE "new_api_keys" RENAME TO "api_keys";
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");
CREATE INDEX "api_keys_keyHash_idx" ON "api_keys"("keyHash");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "applicants_approved_idx" ON "applicants"("approved");

-- CreateIndex
CREATE INDEX "applicants_emailVerified_idx" ON "applicants"("emailVerified");

-- CreateIndex
CREATE INDEX "form_submissions_status_idx" ON "form_submissions"("status");

-- CreateIndex
CREATE INDEX "form_submissions_applicantId_status_idx" ON "form_submissions"("applicantId", "status");
