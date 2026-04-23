import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * GET /api/reports/summary
 * 
 * High-performance SQL-native aggregation.
 * Returns national totals + division/district breakdown in a single query.
 * Replaces the old N-row fetch + JS .reduce() pattern.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const outbreakId = searchParams.get('outbreakId') || 'measles-2026';
    const dateQuery = searchParams.get('date');
    const fromQuery = searchParams.get('from');
    const toQuery = searchParams.get('to');
    const division = searchParams.get('division') || searchParams.get('divisions');
    const district = searchParams.get('district') || searchParams.get('districts');

    // Validate date formats
    const validDate = (d: string | null) => d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
    const vDate = validDate(dateQuery);
    const vFrom = validDate(fromQuery);
    const vTo = validDate(toQuery);

    // --- National Totals (single row) ---
    const totalsResult: any[] = await prisma.$queryRaw`
      SELECT
        COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'suspected24h', '')::numeric, 0)), 0) AS "suspected24h",
        COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'confirmed24h', '')::numeric, 0)), 0) AS "confirmed24h",
        COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'admitted24h', '')::numeric, 0)), 0) AS "admitted24h",
        COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'discharged24h', '')::numeric, 0)), 0) AS "discharged24h",
        COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'confirmedDeath24h', '')::numeric, 0)), 0) AS "confirmedDeath24h",
        COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'suspectedDeath24h', '')::numeric, 0)), 0) AS "suspectedDeath24h",
        COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'serumSent24h', '')::numeric, 0)), 0) AS "serumSent24h",
        COUNT(r.id)::int AS "reportCount"
      FROM "Report" r
      JOIN "Facility" f ON f.id = r."facilityId"
      WHERE r."outbreakId" = ${outbreakId}
        AND r.status = 'PUBLISHED'
        AND (${vDate}::text IS NULL OR r."periodStart"::date = ${vDate}::date)
        AND (${vFrom}::text IS NULL OR r."periodStart"::date >= ${vFrom}::date)
        AND (${vTo}::text IS NULL OR r."periodStart"::date <= ${vTo}::date)
        AND (${division ?? ''}::text = '' OR f.division = ${division ?? ''})
        AND (${district ?? ''}::text = '' OR f.district = ${district ?? ''})
    `;

    // --- Division/District Breakdown ---
    // Group by division (default), district (if division filter), or facility (if district filter)
    let groupByCol: string;
    if (district) groupByCol = 'f."facilityName"';
    else if (division) groupByCol = 'f.district';
    else groupByCol = 'f.division';

    const breakdownResult: any[] = await prisma.$queryRaw(
      Prisma.sql`
        SELECT
          ${Prisma.raw(groupByCol)} AS "groupKey",
          COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'suspected24h', '')::numeric, 0)), 0) AS "suspected24h",
          COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'confirmed24h', '')::numeric, 0)), 0) AS "confirmed24h",
          COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'admitted24h', '')::numeric, 0)), 0) AS "admitted24h",
          COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'discharged24h', '')::numeric, 0)), 0) AS "discharged24h",
          COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'confirmedDeath24h', '')::numeric, 0)), 0) AS "confirmedDeath24h",
          COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'suspectedDeath24h', '')::numeric, 0)), 0) AS "suspectedDeath24h",
          COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'serumSent24h', '')::numeric, 0)), 0) AS "serumSent24h",
          COUNT(r.id)::int AS "reportCount"
        FROM "Report" r
        JOIN "Facility" f ON f.id = r."facilityId"
        WHERE r."outbreakId" = ${outbreakId}
          AND r.status = 'PUBLISHED'
          AND (${vDate ?? ''}::text = '' OR r."periodStart"::date = ${vDate ?? ''}::date)
          AND (${vFrom ?? ''}::text = '' OR r."periodStart"::date >= ${vFrom ?? ''}::date)
          AND (${vTo ?? ''}::text = '' OR r."periodStart"::date <= ${vTo ?? ''}::date)
          AND (${division ?? ''}::text = '' OR f.division = ${division ?? ''})
          AND (${district ?? ''}::text = '' OR f.district = ${district ?? ''})
        GROUP BY ${Prisma.raw(groupByCol)}
        ORDER BY "suspected24h" DESC
      `
    );

    // Format totals
    const t = totalsResult[0] || {};
    const totals: Record<string, number> = {
      suspected24h: Number(t.suspected24h) || 0,
      confirmed24h: Number(t.confirmed24h) || 0,
      admitted24h: Number(t.admitted24h) || 0,
      discharged24h: Number(t.discharged24h) || 0,
      confirmedDeath24h: Number(t.confirmedDeath24h) || 0,
      suspectedDeath24h: Number(t.suspectedDeath24h) || 0,
      serumSent24h: Number(t.serumSent24h) || 0,
    };

    // Format breakdown
    const breakdown: Record<string, Record<string, number>> = {};
    for (const row of breakdownResult) {
      if (!row.groupKey) continue;
      breakdown[row.groupKey] = {
        suspected24h: Number(row.suspected24h) || 0,
        confirmed24h: Number(row.confirmed24h) || 0,
        admitted24h: Number(row.admitted24h) || 0,
        discharged24h: Number(row.discharged24h) || 0,
        confirmedDeath24h: Number(row.confirmedDeath24h) || 0,
        suspectedDeath24h: Number(row.suspectedDeath24h) || 0,
        serumSent24h: Number(row.serumSent24h) || 0,
      };
    }

    return NextResponse.json({
      totals,
      breakdown,
      debug: { reportCount: Number(t.reportCount) || 0 }
    });
  } catch (error: any) {
    console.error('[Summary API Error]', error);
    return NextResponse.json({ error: 'Aggregation failed', details: error.message }, { status: 500 });
  }
}
