-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_form_submissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicantId" TEXT NOT NULL,
    "formType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "formData" JSONB,
    "receiptFile" TEXT,
    "submittedAt" DATETIME,
    "statusChangedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAlertSentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "form_submissions_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "applicants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_form_submissions" ("applicantId", "createdAt", "formData", "formType", "id", "receiptFile", "status", "submittedAt", "updatedAt") SELECT "applicantId", "createdAt", "formData", "formType", "id", "receiptFile", "status", "submittedAt", "updatedAt" FROM "form_submissions";
DROP TABLE "form_submissions";
ALTER TABLE "new_form_submissions" RENAME TO "form_submissions";
CREATE UNIQUE INDEX "form_submissions_applicantId_formType_key" ON "form_submissions"("applicantId", "formType");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
