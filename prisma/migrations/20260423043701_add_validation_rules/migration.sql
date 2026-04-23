/*
  Warnings:

  - You are about to drop the column `modernReportId` on the `ReportFieldValue` table. All the data in the column will be lost.
  - You are about to drop the column `cutoffHour` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `cutoffMinute` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `editDeadlineHour` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `editDeadlineMinute` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `publishTimeHour` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `publishTimeMinute` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the `DailyReport` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `reportId` on table `ReportFieldValue` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "DailyReport" DROP CONSTRAINT "DailyReport_facilityId_fkey";

-- DropForeignKey
ALTER TABLE "DailyReport" DROP CONSTRAINT "DailyReport_outbreakId_fkey";

-- DropForeignKey
ALTER TABLE "DailyReport" DROP CONSTRAINT "DailyReport_userId_fkey";

-- DropForeignKey
ALTER TABLE "ReportFieldValue" DROP CONSTRAINT "ReportFieldValue_modernReportId_fkey";

-- DropForeignKey
ALTER TABLE "ReportFieldValue" DROP CONSTRAINT "ReportFieldValue_reportId_fkey";

-- DropIndex
DROP INDEX "ReportFieldValue_modernReportId_formFieldId_key";

-- DropIndex
DROP INDEX "ReportFieldValue_modernReportId_idx";

-- AlterTable
ALTER TABLE "FormField" ADD COLUMN     "validationRules" JSONB DEFAULT '[]';

-- AlterTable
ALTER TABLE "ReportFieldValue" DROP COLUMN "modernReportId",
ALTER COLUMN "reportId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Settings" DROP COLUMN "cutoffHour",
DROP COLUMN "cutoffMinute",
DROP COLUMN "editDeadlineHour",
DROP COLUMN "editDeadlineMinute",
DROP COLUMN "publishTimeHour",
DROP COLUMN "publishTimeMinute";

-- DropTable
DROP TABLE "DailyReport";

-- CreateIndex
CREATE INDEX "Report_outbreakId_status_periodStart_idx" ON "Report"("outbreakId", "status", "periodStart" DESC);

-- CreateIndex
CREATE INDEX "Report_facilityId_outbreakId_periodStart_idx" ON "Report"("facilityId", "outbreakId", "periodStart" DESC);

-- AddForeignKey
ALTER TABLE "ReportFieldValue" ADD CONSTRAINT "ReportFieldValue_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
