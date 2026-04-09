import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") || "30", 10);

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const reports = await prisma.dailyReport.findMany({
      where: {
        reportingDate: { gte: startDate },
      },
      orderBy: { reportingDate: "asc" },
    });

    const byDate: Record<string, { suspected: number; confirmed: number; deaths: number; hospitalized: number }> = {};

    reports.forEach((r) => {
      const dateKey = r.reportingDate.toISOString().split("T")[0];
      if (!byDate[dateKey]) {
        byDate[dateKey] = { suspected: 0, confirmed: 0, deaths: 0, hospitalized: 0 };
      }
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