/*
  Warnings:

  - Added the required column `role` to the `applicants` table without a default value. This is not possible if the table is not empty.

*/
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
    "phone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_applicants" ("createdAt", "email", "firstName", "id", "lastName", "password", "phone", "updatedAt", "role") SELECT "createdAt", "email", "firstName", "id", "lastName", "password", "phone", "updatedAt", 'RECRUITER' FROM "applicants";
DROP TABLE "applicants";
ALTER TABLE "new_applicants" RENAME TO "applicants";
CREATE UNIQUE INDEX "applicants_email_key" ON "applicants"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
