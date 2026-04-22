-- AlterTable
ALTER TABLE "applicants" ADD COLUMN "archivedAt" DATETIME;
ALTER TABLE "applicants" ADD COLUMN "archivedBy" TEXT;

-- CreateIndex
CREATE INDEX "applicants_archivedAt_idx" ON "applicants"("archivedAt");
