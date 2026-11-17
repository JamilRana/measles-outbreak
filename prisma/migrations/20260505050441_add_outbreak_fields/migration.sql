-- AlterTable
ALTER TABLE "Outbreak" ADD COLUMN     "hasDashboard" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "submissionOpenHour" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "submissionOpenMinute" INTEGER NOT NULL DEFAULT 0;
