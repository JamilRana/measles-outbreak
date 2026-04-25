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

    // 1. Fetch Core Fields for Dynamic Aggregation
    const coreFields = await prisma.formField.findMany({
      where: { outbreakId, isCoreField: true },
      select: { fieldKey: true }
    });

    // Fallback if no core fields defined
    const fallbackFields = [
      'suspected24h', 'confirmed24h', 'admitted24h', 'discharged24h',
      'confirmedDeath24h', 'suspectedDeath24h', 'serumSent24h'
    ];
    
    const fieldsToAggregate = coreFields.length > 0 
      ? coreFields.map(f => f.fieldKey)
      : fallbackFields;

    // Build dynamic SQL select parts
    const aggSql = fieldsToAggregate.map(key => 
      Prisma.sql`COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>${key}, '')::numeric, 0)), 0) AS ${Prisma.raw(`"${key}"`)}`
    );

    // --- National Totals ---
    const totalsResult: any[] = await prisma.$queryRaw`
      SELECT
        ${Prisma.join(aggSql, ', ')},
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
    let groupByCol: string;
    if (district) groupByCol = 'f."facilityName"';
    else if (division) groupByCol = 'f.district';
    else groupByCol = 'f.division';

    const breakdownResult: any[] = await prisma.$queryRaw(
      Prisma.sql`
        SELECT
          ${Prisma.raw(groupByCol)} AS "groupKey",
          ${Prisma.join(aggSql, ', ')},
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
        ORDER BY ${Prisma.raw(fieldsToAggregate[0])} DESC
      `
    );

    // Format totals
    const t = totalsResult[0] || {};
    const totals: Record<string, number> = {};
    fieldsToAggregate.forEach(key => {
      totals[key] = Number(t[key]) || 0;
    });

    // Format breakdown
    const breakdown: Record<string, Record<string, number>> = {};
    for (const row of breakdownResult) {
      if (!row.groupKey) continue;
      const rowData: Record<string, number> = {};
      fieldsToAggregate.forEach(key => {
        rowData[key] = Number(row[key]) || 0;
      });
      breakdown[row.groupKey] = rowData;
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
