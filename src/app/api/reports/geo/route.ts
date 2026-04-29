import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBdTime, getBdDateString } from "@/lib/timezone";
import { BD_DISTRICT_COORDS } from "@/lib/bd-districts";

/**
 * GET /api/reports/geo
 * 
 * SQL-native geographic aggregation.
 * Returns district-level aggregates with lat/lng from static coord map.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const outbreakId = searchParams.get("outbreakId") || 'measles-2026';
    const division = searchParams.get("division") || searchParams.get("divisions");
    const district = searchParams.get("district") || searchParams.get("districts");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // Temporal Visibility Logic
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'EDITOR';
    const now = getBdTime();
    const today = getBdDateString(now);
    let effectiveDate = date;

    const outbreak = await prisma.outbreak.findUnique({
      where: { id: outbreakId },
      select: { publishTimeHour: true, publishTimeMinute: true }
    });

    let isPending = false;
    if (outbreak && !isAdmin) {
      const publishTime = new Date(now);
      publishTime.setHours(outbreak.publishTimeHour, outbreak.publishTimeMinute, 0, 0);
      
      // ONLY trigger pending status if explicitly requesting today's date
      if (now < publishTime && effectiveDate === today) {
        isPending = true;
      }
    }

    if (isPending) {
      return NextResponse.json([]);
    }

    const validDate = (d: string | null) => d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
    const vDate = validDate(effectiveDate);
    const vFrom = validDate(from);
    const vTo = validDate(to);

    const result: any[] = await prisma.$queryRaw`
      SELECT
        f.division,
        f.district,
        COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'confirmed24h', '')::numeric, 0)), 0) AS confirmed,
        COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'suspectedDeath24h', '')::numeric, 0)), 0) +
        COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'confirmedDeath24h', '')::numeric, 0)), 0) AS deaths,
        COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'admitted24h', '')::numeric, 0)), 0) AS hospitalized
      FROM "Report" r
      JOIN "Facility" f ON f.id = r."facilityId"
      WHERE r."outbreakId" = ${outbreakId}
        AND r.status = 'PUBLISHED'
        AND (${vDate}::text IS NULL OR r."periodStart"::date = ${vDate}::date)
        AND (${vFrom}::text IS NULL OR r."periodStart"::date >= ${vFrom}::date)
        AND (${vTo}::text IS NULL OR r."periodStart"::date <= ${vTo}::date)
        AND (${division ?? ''}::text = '' OR f.division = ${division ?? ''})
        AND (${district ?? ''}::text = '' OR f.district = ${district ?? ''})
      GROUP BY f.division, f.district
    `;

    const geoData = result
      .filter((d) => d.district && BD_DISTRICT_COORDS[d.district])
      .map((d) => ({
        district: d.district,
        division: d.division,
        confirmed: Number(d.confirmed) || 0,
        deaths: Number(d.deaths) || 0,
        hospitalized: Number(d.hospitalized) || 0,
        lat: BD_DISTRICT_COORDS[d.district].lat,
        lng: BD_DISTRICT_COORDS[d.district].lng,
      }));

    return NextResponse.json(geoData);
  } catch (error) {
    console.error("Geo data error:", error);
    return NextResponse.json({ error: "Failed to fetch geo data" }, { status: 500 });
  }
}