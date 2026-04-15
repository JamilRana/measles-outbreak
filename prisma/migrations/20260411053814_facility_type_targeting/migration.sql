-- AlterTable
ALTER TABLE "BacklogSlot" ADD COLUMN     "targetDistricts" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "targetDivisions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "targetFacilityTypeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "createdBy" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Facility" ADD COLUMN     "facilityTypeId" TEXT;

-- AlterTable
ALTER TABLE "SubmissionWindow" ADD COLUMN     "facilityId" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "targetDistricts" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "targetDivisions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "targetFacilityTypeIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "FacilityType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tier" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FacilityType_name_key" ON "FacilityType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FacilityType_slug_key" ON "FacilityType"("slug");

-- CreateIndex
CREATE INDEX "Facility_facilityTypeId_idx" ON "Facility"("facilityTypeId");

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_facilityTypeId_fkey" FOREIGN KEY ("facilityTypeId") REFERENCES "FacilityType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionWindow" ADD CONSTRAINT "SubmissionWindow_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BacklogSlot" ADD CONSTRAINT "BacklogSlot_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;
