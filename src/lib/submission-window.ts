import { prisma } from "@/lib/prisma";

// Helper: is Today?
function isToday(date: Date) {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

// Helper: is facility eligible for this outbreak?
function isFacilityEligible(facility: Facility, window: any) {
  if (!window) return false;
  // If no targeting constraints, all facilities are eligible
  if (!window.targetDivisions?.length && !window.targetDistricts?.length && !window.targetFacilityTypeIds?.length) {
    return true;
  }
  // Check targeting
  if (window.targetDivisions?.length && !window.targetDivisions.includes(facility.division)) {
    return false;
  }
  if (window.targetDistricts?.length && !window.targetDistricts.includes(facility.district)) {
    return false;
  }
  if (window.targetFacilityTypeIds?.length && !window.targetFacilityTypeIds.includes(facility.facilityType || '')) {
    return false;
  }
  return true;
}

interface Facility {
  id: string;
  division: string;
  district: string;
  facilityType?: string | null;
}

/**
 * Determines the active submission window for a given facility on a given date.
 * Priority: SubmissionWindow > Outbreak Backlog > Default
 * 
 * @param outbreakId - The active outbreak ID
 * @param facility - The facility object with division, district, facilityType
 * @param reportingDate - The date for which to submit (defaults to today)
 * @returns The active SubmissionWindow, or { type: 'BACKLOG' | 'FALLBACK', window: ... }, or null if no window
 */
export async function getActiveWindow(
  outbreakId: string,
  facility: Facility,
  reportingDate: Date = new Date()
): Promise<{ type: 'WINDOW' | 'BACKLOG' | 'FALLBACK', window: any } | null> {
  const now = new Date();
  
  // If date is in the future, allow if backlog is configured
  if (reportingDate > now) {
    const outbreak = await prisma.outbreak.findUnique({
      where: { id: outbreakId },
      select: {
        allowBacklogReporting: true,
        backlogStartDate: true,
        backlogEndDate: true,
      }
    });
    if (outbreak?.allowBacklogReporting) {
      return { type: 'BACKLOG', window: { id: 'future-backlog', isActive: true } };
    }
    return null;
  }

  // 1. Check custom SubmissionWindows first
  const submissionWindows = await prisma.submissionWindow.findMany({
    where: { outbreakId, isActive: true },
    orderBy: { opensAt: 'asc' },
  });

  for (const window of submissionWindows) {
    // Skip future windows
    if (window.opensAt > now) continue;
    // Skip expired windows  
    if (window.closesAt && window.closesAt < now) continue;
    
    // Check eligibility
    if (isFacilityEligible(facility, window)) {
      return { type: 'WINDOW' as const, window };
    }
  }

  // 2. Check backlog window
  const backlogCandidates = submissionWindows.filter(w => w.periodEnd! >= reportingDate);
  const backlog = backlogCandidates.find(s => isFacilityEligible(facility, s));
  if (backlog) return { type: 'BACKLOG' as const, window: backlog };

  // 3. Fallback: check Outbreak default cutoff & global backlog settings
  const outbreak = await prisma.outbreak.findUnique({
    where: { id: outbreakId },
    select: { 
      allowBacklogReporting: true,
      backlogStartDate: true,
      backlogEndDate: true,
      targetDivisions: true,
      targetDistricts: true,
      targetFacilityTypeIds: true
    }
  });

  if (!outbreak) return null;

  // Check if facility is targeted by this outbreak
  if (!isFacilityEligible(facility, outbreak)) return null;

  // A. Today's standard reporting window - allow if today
  if (isToday(reportingDate)) {
    return { type: 'FALLBACK', window: { id: 'today-fallback', opensAt: new Date(reportingDate.setHours(8,0,0,0)), isActive: true } };
  }

  // B. Global Outbreak Backlog
  if (outbreak.allowBacklogReporting) {
    const dateToCheck = new Date(reportingDate);
    const start = outbreak.backlogStartDate;
    const end = outbreak.backlogEndDate;

    const isInBacklog = (!start || dateToCheck >= start) && (!end || dateToCheck <= end);
    if (isInBacklog) {
      return { 
        type: 'BACKLOG' as const, 
        window: { 
          id: 'global-backlog', 
          name: 'Outbreak Backlog',
          periodStart: reportingDate,
          periodEnd: reportingDate,
          isActive: true
        }
      };
    }
  }

  return null;
}