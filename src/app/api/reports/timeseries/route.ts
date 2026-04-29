import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBdTime, getBdDateString } from "@/lib/timezone";

/**
 * GET /api/reports/timeseries
 * 
 * SQL-native time-series aggregation.
 * Returns pre-sorted daily aggregates — no JS-side grouping needed.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = Math.min(Math.max(parseInt(searchParams.get("days") || "30", 10), 1), 365);
  const outbreakId = searchParams.get("outbreakId") || 'measles-2026';
  const division = searchParams.get("division") || searchParams.get("divisions");
  const district = searchParams.get("district") || searchParams.get("districts");
  
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'EDITOR';
  const now = getBdTime();
  const today = getBdDateString(now);

  const outbreak = await prisma.outbreak.findUnique({
    where: { id: outbreakId },
    select: { publishTimeHour: true, publishTimeMinute: true }
  });

  let effectiveEnd = "NOW()";
  let isPending = false;
  if (outbreak && !isAdmin) {
    const publishTime = new Date(now);
    publishTime.setHours(outbreak.publishTimeHour, outbreak.publishTimeMinute, 0, 0);
    if (now < publishTime) {
      isPending = true;
      // If before publish time, shift the "now" for the interval to yesterday end
      effectiveEnd = `(CURRENT_DATE - INTERVAL '1 second')`;
    }
  }

  try {
    const result: any[] = await prisma.$queryRaw`
      SELECT
        r."periodStart"::date AS date,
        COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'suspected24h', '')::numeric, 0)), 0) AS suspected,
        COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'confirmed24h', '')::numeric, 0)), 0) AS confirmed,
        COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'confirmedDeath24h', '')::numeric, 0)), 0) +
        COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'suspectedDeath24h', '')::numeric, 0)), 0) AS deaths,
        COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'admitted24h', '')::numeric, 0)), 0) AS hospitalized
      FROM "Report" r
      JOIN "Facility" f ON f.id = r."facilityId"
      WHERE r."outbreakId" = ${outbreakId}
        AND r.status = 'PUBLISHED'
        AND r."periodStart" >= ${effectiveEnd === "NOW()" ? Prisma.raw("NOW()") : Prisma.raw("CURRENT_DATE")} - INTERVAL '1 day' * ${days}
        AND r."periodStart" <= ${Prisma.raw(effectiveEnd)}
        AND (${division ?? ''}::text = '' OR f.division = ${division ?? ''})
        AND (${district ?? ''}::text = '' OR f.district = ${district ?? ''})
      GROUP BY r."periodStart"::date
      ORDER BY date ASC
    `;

    const timeseries = result.map(row => ({
      date: row.date instanceof Date ? row.date.toISOString().split("T")[0] : String(row.date),
      suspected: Number(row.suspected) || 0,
      confirmed: Number(row.confirmed) || 0,
      deaths: Number(row.deaths) || 0,
      hospitalized: Number(row.hospitalized) || 0,
    }));

    return NextResponse.json(timeseries);
  } catch (error) {
    console.error("Timeseries error:", error);
    return NextResponse.json({ error: "Failed to fetch timeseries" }, { status: 500 });
  }
}