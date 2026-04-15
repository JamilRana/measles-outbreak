import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBdTime, getBdDateString } from "@/lib/timezone";

/**
 * GET /api/submission/open-window
 * 
 * Public/User API to check if a specific reporting date is open for submission 
 * for a given facility and outbreak.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const outbreakId = searchParams.get("outbreakId");
    const facilityId = searchParams.get("facilityId");
    const dateStr = searchParams.get("date"); // Expected YYYY-MM-DD

    if (!outbreakId || !facilityId || !dateStr) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const reportingDate = new Date(dateStr);
    const now = getBdTime();
    
    // Get facility info
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId }
    });
    
    if (!facility) {
      return NextResponse.json({ error: "Facility not found" }, { status: 404 });
    }

    // Check SubmissionWindows first
    const submissionWindows = await prisma.submissionWindow.findMany({
      where: { outbreakId, isActive: true },
      orderBy: { opensAt: 'asc' },
    });

    for (const window of submissionWindows) {
      if (window.opensAt > now) continue;
      if (window.closesAt && window.closesAt < now) continue;
      
      // Check targeting
      const isEligible = 
        (!window.targetDivisions?.length || window.targetDivisions.includes(facility.division)) &&
        (!window.targetDistricts?.length || window.targetDistricts.includes(facility.district)) &&
        (!window.targetFacilityTypeIds?.length || window.targetFacilityTypeIds.includes(facility.facilityType || ''));
      
      if (isEligible) {
        return NextResponse.json({ 
          open: true, 
          type: 'WINDOW',
          details: window
        });
      }
    }

    // Check backlog
    const outbreak = await prisma.outbreak.findUnique({
      where: { id: outbreakId },
      select: {
        allowBacklogReporting: true,
        backlogStartDate: true,
        backlogEndDate: true,
      }
    });

    if (outbreak?.allowBacklogReporting) {
      const start = outbreak.backlogStartDate;
      const end = outbreak.backlogEndDate;
      const isInBacklog = (!start || reportingDate >= start) && (!end || reportingDate <= end);
      
      if (isInBacklog) {
        return NextResponse.json({ 
          open: true, 
          type: 'BACKLOG',
          details: { name: 'Backlog Reporting', periodStart: reportingDate, periodEnd: reportingDate }
        });
      }
    }

    // Check if today and within default hours
    const today = getBdDateString();
    if (dateStr === today) {
      return NextResponse.json({ 
        open: true, 
        type: 'FALLBACK',
        details: { name: 'Daily Submission', periodStart: reportingDate, periodEnd: reportingDate }
      });
    }

    return NextResponse.json({ 
      open: false, 
      type: null,
      details: null
    });
  } catch (error) {
    console.error("Open window check error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}