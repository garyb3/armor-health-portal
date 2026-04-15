/*
  Warnings:

  - Added the required column `updatedAt` to the `notes` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_notes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "notes_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "applicants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_notes" ("applicantId", "authorId", "authorName", "content", "createdAt", "updatedAt", "id") SELECT "applicantId", "authorId", "authorName", "content", "createdAt", "createdAt", "id" FROM "notes";
DROP TABLE "notes";
ALTER TABLE "new_notes" RENAME TO "notes";
CREATE INDEX "notes_applicantId_createdAt_idx" ON "notes"("applicantId", "createdAt");
CREATE INDEX "notes_authorId_idx" ON "notes"("authorId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
