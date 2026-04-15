/**
 * Targeting Engine
 * 
 * Determines whether a facility is eligible for a given submission window
 * or backlog slot based on geographic and facility-type targeting rules.
 * 
 * Rule: empty targeting array = "all" (no restriction).
 */

interface TargetableWindow {
  targetDivisions: string[];
  targetDistricts: string[];
  targetFacilityTypeIds: string[];
  facilityId?: string | null;
}

interface TargetableFacility {
  id: string;
  division: string;
  district: string;
  facilityTypeId: string | null;
}

export function isFacilityEligible(
  facility: TargetableFacility,
  window: TargetableWindow
): boolean {
  // 1. If the window targets a specific facility, only that facility matches
  if (window.facilityId) {
    return window.facilityId === facility.id;
  }

  // 2. Geographic: Division
  if (window.targetDivisions.length > 0) {
    if (!window.targetDivisions.includes(facility.division)) return false;
  }

  // 3. Geographic: District
  if (window.targetDistricts.length > 0) {
    if (!window.targetDistricts.includes(facility.district)) return false;
  }

  // 4. Facility Type
  if (window.targetFacilityTypeIds.length > 0) {
    if (!facility.facilityTypeId) return false; // facility has no type assigned → doesn't match
    if (!window.targetFacilityTypeIds.includes(facility.facilityTypeId)) return false;
  }

  return true;
}
