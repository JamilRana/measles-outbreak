-- AlterTable
ALTER TABLE "Outbreak" ADD COLUMN     "cutoffHour" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN     "cutoffMinute" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reportingFrequency" "ReportingFrequency" NOT NULL DEFAULT 'DAILY',
ADD COLUMN     "targetDistricts" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "targetDivisions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "targetFacilityTypeIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
