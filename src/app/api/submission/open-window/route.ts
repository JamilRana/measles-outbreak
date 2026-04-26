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

    // Check for administrative session
    const { getServerSession } = require("next-auth");
    const { authOptions } = require("@/lib/auth");
    const session = await getServerSession(authOptions);
    const isAdminOrEditor = session?.user?.role === 'ADMIN' || session?.user?.role === 'EDITOR';

    if (isAdminOrEditor) {
      return NextResponse.json({ 
        open: true, 
        type: 'ADMIN_OVERRIDE',
        details: { name: 'Administrative Override', periodStart: reportingDate, periodEnd: reportingDate }
      });
    }
    
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

    // Check outbreak settings (backlog + default cutoff)
    const outbreak = await prisma.outbreak.findUnique({
      where: { id: outbreakId },
      select: {
        allowBacklogReporting: true,
        backlogStartDate: true,
        backlogEndDate: true,
        cutoffHour: true,
        cutoffMinute: true,
      }
    });

    if (!outbreak) {
      return NextResponse.json({ error: "Outbreak not found" }, { status: 404 });
    }

    if (outbreak.allowBacklogReporting) {
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

    // Check if today and within default hours (from outbreak settings)
    const today = getBdDateString();
    if (dateStr === today) {
      const cutoff = new Date(now);
      cutoff.setHours(outbreak.cutoffHour, outbreak.cutoffMinute, 0, 0);
      
      if (now > cutoff) {
        return NextResponse.json({ 
          open: false, 
          type: 'DAILY_CLOSED',
          details: { name: 'Daily Submission Closed', cutoff: `${String(outbreak.cutoffHour).padStart(2, '0')}:${String(outbreak.cutoffMinute).padStart(2, '0')}` }
        });
      }

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