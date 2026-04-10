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

    const where: any = {
      reportingDate: { gte: startDate },
    };
    if (outbreakId) where.outbreakId = outbreakId;
    if (division) where.facility = { ...where.facility, division };
    if (district) where.facility = { ...where.facility, district };

    const reports = await prisma.dailyReport.findMany({
      where,
      include: {
        fieldValues: {
          include: { formField: true }
        }
      },
      orderBy: { reportingDate: "asc" },
    });

    const byDate: Record<string, { suspected: number; confirmed: number; deaths: number; hospitalized: number }> = {};

    reports.forEach((r) => {
      const dateKey = r.reportingDate.toISOString().split("T")[0];
      if (!byDate[dateKey]) {
        byDate[dateKey] = { suspected: 0, confirmed: 0, deaths: 0, hospitalized: 0 };
      }

      // Map dynamic fields
      const dynamicSuspected = r.fieldValues.find(f => f.formField.fieldKey === 'suspected24h')?.value;
      const dynamicConfirmed = r.fieldValues.find(f => f.formField.fieldKey === 'confirmed24h')?.value;
      const dynamicSDeath = r.fieldValues.find(f => f.formField.fieldKey === 'suspectedDeath24h')?.value;
      const dynamicCDeath = r.fieldValues.find(f => f.formField.fieldKey === 'confirmedDeath24h')?.value;
      const dynamicAdmitted = r.fieldValues.find(f => f.formField.fieldKey === 'admitted24h')?.value;

      // prioritize dynamic fields, fallback to columns
      byDate[dateKey].suspected += dynamicSuspected ? Number(dynamicSuspected) : r.suspected24h;
      byDate[dateKey].confirmed += dynamicConfirmed ? Number(dynamicConfirmed) : r.confirmed24h;
      
      const deaths = (dynamicSDeath ? Number(dynamicSDeath) : r.suspectedDeath24h) + 
                     (dynamicCDeath ? Number(dynamicCDeath) : r.confirmedDeath24h);
      byDate[dateKey].deaths += deaths;
      
      byDate[dateKey].hospitalized += dynamicAdmitted ? Number(dynamicAdmitted) : r.admitted24h;
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