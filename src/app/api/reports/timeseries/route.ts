import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") || "30", 10);
  const outbreakId = searchParams.get("outbreakId");
  const division = searchParams.get("division");
  const district = searchParams.get("district");

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // 1. Fetch from Modern table
    const whereModern: any = {
      periodStart: { gte: startDate },
      status: "PUBLISHED"
    };
    if (outbreakId) whereModern.outbreakId = outbreakId;
    if (division || district) {
      whereModern.facility = {
        ...(division && { division }),
        ...(district && { district }),
      };
    }

    // 2. Fetch from Legacy table
    const whereLegacy: any = {
      reportingDate: { gte: startDate },
      published: true
    };
    if (outbreakId) whereLegacy.outbreakId = outbreakId;
    if (division || district) {
      whereLegacy.facility = {
        ...(division && { division }),
        ...(district && { district }),
      };
    }

    const [modernReports, legacyReports] = await Promise.all([
      prisma.report.findMany({ where: whereModern, select: { periodStart: true, dataSnapshot: true } }),
      prisma.dailyReport.findMany({ where: whereLegacy })
    ]);

    const byDate: Record<string, { suspected: number; confirmed: number; deaths: number; hospitalized: number }> = {};

    // Process Modern
    modernReports.forEach(r => {
      const dateKey = r.periodStart.toISOString().split("T")[0];
      if (!byDate[dateKey]) byDate[dateKey] = { suspected: 0, confirmed: 0, deaths: 0, hospitalized: 0 };
      
      const snap = r.dataSnapshot as any;
      byDate[dateKey].suspected += (Number(snap.suspected24h) || 0);
      byDate[dateKey].confirmed += (Number(snap.confirmed24h) || 0);
      byDate[dateKey].deaths += (Number(snap.suspectedDeath24h) || 0) + (Number(snap.confirmedDeath24h) || 0);
      byDate[dateKey].hospitalized += (Number(snap.admitted24h) || 0);
    });

    // Process Legacy
    legacyReports.forEach((r) => {
      const dateKey = r.reportingDate.toISOString().split("T")[0];
      if (!byDate[dateKey]) byDate[dateKey] = { suspected: 0, confirmed: 0, deaths: 0, hospitalized: 0 };
      
      byDate[dateKey].suspected += r.suspected24h;
      byDate[dateKey].confirmed += r.confirmed24h;
      byDate[dateKey].deaths += r.suspectedDeath24h + r.confirmedDeath24h;
      byDate[dateKey].hospitalized += r.admitted24h;
    });

    const timeseries = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }));

    return NextResponse.json(timeseries);
  } catch (error) {
    console.error("Timeseries error:", error);
    return NextResponse.json({ error: "Failed to fetch timeseries" }, { status: 500 });
  }
}