-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'EDITOR', 'ADMIN', 'VIEWER');

-- CreateEnum
CREATE TYPE "OutbreakStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CONTAINED', 'CLOSED');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('NUMBER', 'TEXT', 'SELECT', 'DATE', 'BOOLEAN');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "ReportingFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PUBLISHED', 'LOCKED');

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "facilityCode" TEXT NOT NULL,
    "facilityName" TEXT NOT NULL,
    "facilityType" TEXT,
    "division" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "upazila" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT,
    "nameNormalized" TEXT NOT NULL,
    "facilityId" TEXT,
    "managedDivisions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "managedDistricts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "role" "Role" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disease" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Disease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outbreak" (
    "id" TEXT NOT NULL,
    "diseaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "OutbreakStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "allowBacklogReporting" BOOLEAN NOT NULL DEFAULT false,
    "backlogStartDate" TIMESTAMP(3),
    "backlogEndDate" TIMESTAMP(3),

    CONSTRAINT "Outbreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormField" (
    "id" TEXT NOT NULL,
    "outbreakId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "labelBn" TEXT,
    "fieldKey" TEXT NOT NULL,
    "fieldType" "FieldType" NOT NULL DEFAULT 'NUMBER',
    "options" TEXT,
    "section" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isCoreField" BOOLEAN NOT NULL DEFAULT false,
    "activeFrom" TIMESTAMP(3),
    "activeTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportFieldValue" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "modernReportId" TEXT,
    "formFieldId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "ReportFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyReport" (
    "id" TEXT NOT NULL,
    "reportingDate" TIMESTAMP(3) NOT NULL,
    "facilityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "suspected24h" INTEGER NOT NULL DEFAULT 0,
    "confirmed24h" INTEGER NOT NULL DEFAULT 0,
    "suspectedDeath24h" INTEGER NOT NULL DEFAULT 0,
    "confirmedDeath24h" INTEGER NOT NULL DEFAULT 0,
    "admitted24h" INTEGER NOT NULL DEFAULT 0,
    "discharged24h" INTEGER NOT NULL DEFAULT 0,
    "serumSent24h" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "outbreakId" TEXT NOT NULL,

    CONSTRAINT "DailyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "outbreakId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'SUBMITTED',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedBy" TEXT,
    "lockedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "dataSnapshot" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionWindow" (
    "id" TEXT NOT NULL,
    "outbreakId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "opensAt" TIMESTAMP(3) NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BacklogSlot" (
    "id" TEXT NOT NULL,
    "outbreakId" TEXT NOT NULL,
    "facilityId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "opensAt" TIMESTAMP(3) NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BacklogSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailRecipient" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "type" "TokenType" NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "cutoffHour" INTEGER NOT NULL DEFAULT 14,
    "cutoffMinute" INTEGER NOT NULL DEFAULT 0,
    "editDeadlineHour" INTEGER NOT NULL DEFAULT 10,
    "editDeadlineMinute" INTEGER NOT NULL DEFAULT 0,
    "publishTimeHour" INTEGER NOT NULL DEFAULT 9,
    "publishTimeMinute" INTEGER NOT NULL DEFAULT 0,
    "enablePublicView" BOOLEAN NOT NULL DEFAULT true,
    "enableEmailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "defaultOutbreakId" TEXT,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Indicator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "numeratorKey" TEXT NOT NULL,
    "denominatorKey" TEXT,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "unit" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Indicator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Facility_facilityCode_key" ON "Facility"("facilityCode");

-- CreateIndex
CREATE INDEX "Facility_division_idx" ON "Facility"("division");

-- CreateIndex
CREATE INDEX "Facility_district_idx" ON "Facility"("district");

-- CreateIndex
CREATE INDEX "Facility_facilityCode_idx" ON "Facility"("facilityCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_nameNormalized_key" ON "User"("nameNormalized");

-- CreateIndex
CREATE INDEX "User_facilityId_idx" ON "User"("facilityId");

-- CreateIndex
CREATE UNIQUE INDEX "Disease_code_key" ON "Disease"("code");

-- CreateIndex
CREATE INDEX "Outbreak_diseaseId_idx" ON "Outbreak"("diseaseId");

-- CreateIndex
CREATE INDEX "Outbreak_status_idx" ON "Outbreak"("status");

-- CreateIndex
CREATE INDEX "FormField_outbreakId_idx" ON "FormField"("outbreakId");

-- CreateIndex
CREATE UNIQUE INDEX "FormField_outbreakId_fieldKey_key" ON "FormField"("outbreakId", "fieldKey");

-- CreateIndex
CREATE INDEX "ReportFieldValue_reportId_idx" ON "ReportFieldValue"("reportId");

-- CreateIndex
CREATE INDEX "ReportFieldValue_modernReportId_idx" ON "ReportFieldValue"("modernReportId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportFieldValue_reportId_formFieldId_key" ON "ReportFieldValue"("reportId", "formFieldId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportFieldValue_modernReportId_formFieldId_key" ON "ReportFieldValue"("modernReportId", "formFieldId");

-- CreateIndex
CREATE INDEX "DailyReport_outbreakId_idx" ON "DailyReport"("outbreakId");

-- CreateIndex
CREATE INDEX "DailyReport_reportingDate_idx" ON "DailyReport"("reportingDate");

-- CreateIndex
CREATE INDEX "DailyReport_facilityId_reportingDate_idx" ON "DailyReport"("facilityId", "reportingDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyReport_facilityId_outbreakId_reportingDate_key" ON "DailyReport"("facilityId", "outbreakId", "reportingDate");

-- CreateIndex
CREATE INDEX "Report_outbreakId_idx" ON "Report"("outbreakId");

-- CreateIndex
CREATE INDEX "Report_periodStart_idx" ON "Report"("periodStart");

-- CreateIndex
CREATE INDEX "Report_facilityId_periodStart_idx" ON "Report"("facilityId", "periodStart");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Report_facilityId_outbreakId_periodStart_key" ON "Report"("facilityId", "outbreakId", "periodStart");

-- CreateIndex
CREATE INDEX "SubmissionWindow_outbreakId_idx" ON "SubmissionWindow"("outbreakId");

-- CreateIndex
CREATE INDEX "SubmissionWindow_closesAt_idx" ON "SubmissionWindow"("closesAt");

-- CreateIndex
CREATE INDEX "BacklogSlot_outbreakId_idx" ON "BacklogSlot"("outbreakId");

-- CreateIndex
CREATE INDEX "BacklogSlot_facilityId_idx" ON "BacklogSlot"("facilityId");

-- CreateIndex
CREATE INDEX "BacklogSlot_closesAt_idx" ON "BacklogSlot"("closesAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");

-- CreateIndex
CREATE UNIQUE INDEX "EmailRecipient_email_key" ON "EmailRecipient"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_email_token_key" ON "VerificationToken"("email", "token");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outbreak" ADD CONSTRAINT "Outbreak_diseaseId_fkey" FOREIGN KEY ("diseaseId") REFERENCES "Disease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormField" ADD CONSTRAINT "FormField_outbreakId_fkey" FOREIGN KEY ("outbreakId") REFERENCES "Outbreak"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportFieldValue" ADD CONSTRAINT "ReportFieldValue_formFieldId_fkey" FOREIGN KEY ("formFieldId") REFERENCES "FormField"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportFieldValue" ADD CONSTRAINT "ReportFieldValue_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "DailyReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportFieldValue" ADD CONSTRAINT "ReportFieldValue_modernReportId_fkey" FOREIGN KEY ("modernReportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyReport" ADD CONSTRAINT "DailyReport_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyReport" ADD CONSTRAINT "DailyReport_outbreakId_fkey" FOREIGN KEY ("outbreakId") REFERENCES "Outbreak"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyReport" ADD CONSTRAINT "DailyReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_outbreakId_fkey" FOREIGN KEY ("outbreakId") REFERENCES "Outbreak"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionWindow" ADD CONSTRAINT "SubmissionWindow_outbreakId_fkey" FOREIGN KEY ("outbreakId") REFERENCES "Outbreak"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BacklogSlot" ADD CONSTRAINT "BacklogSlot_outbreakId_fkey" FOREIGN KEY ("outbreakId") REFERENCES "Outbreak"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
