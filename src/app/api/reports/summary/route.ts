import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getCachedData } from '@/lib/redis';
import { autoPublishReports } from '@/lib/publish-manager';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBdTime, getBdDateString } from '@/lib/timezone';
import { hasPermission } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const outbreakId = searchParams.get('outbreakId') || 'measles-2026';
    const dateQuery = searchParams.get('date') || '';
    const fromQuery = searchParams.get('from') || '';
    const toQuery = searchParams.get('to') || '';
    const division = searchParams.get('division') || searchParams.get('divisions') || '';
    const district = searchParams.get('district') || searchParams.get('districts') || '';
    const groupBy = searchParams.get('groupBy');

    // Temporal Visibility Logic
    const session = await getServerSession(authOptions);
    const role = session?.user?.role || "";
    const isAdmin = role === 'ADMIN' || role === 'EDITOR' || hasPermission(role, 'admin:view');
    const now = getBdTime();
    const today = getBdDateString(now);
    let effectiveDate = dateQuery;
    let effectiveTo = toQuery;

    const outbreak = await prisma.outbreak.findUnique({
      where: { id: outbreakId },
      select: { publishTimeHour: true, publishTimeMinute: true }
    });

    let isPending = false;
    if (outbreak && !isAdmin) {
      const publishTime = new Date(now);
      publishTime.setHours(outbreak.publishTimeHour, outbreak.publishTimeMinute, 0, 0);
      
      if (now < publishTime) {
        // Case 1: Specific request for Today's date -> Zero it out
        if (effectiveDate === today) {
          isPending = true;
        }
        // Case 2: Cumulative request up to Today -> Shift 'to' to yesterday
        if (effectiveTo === today || (!effectiveDate && !effectiveTo && !fromQuery)) {
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          effectiveTo = getBdDateString(yesterday);
        }
      }
    }

    // Build unique cache key using potentially shifted filters
    const cacheKey = `summary:${outbreakId}:${effectiveDate || 'all'}:${fromQuery || 'all'}:${effectiveTo || 'all'}:${division || 'all'}:${district || 'all'}:${isAdmin ? 'admin' : 'public'}:${isPending ? 'pending' : 'active'}`;

    const data = await getCachedData(cacheKey, async () => {
      // If pending for today, return zeroed data immediately
      if (isPending) {
        return {
          totals: {
            suspected24h: 0, confirmed24h: 0, admitted24h: 0, discharged24h: 0,
            confirmedDeath24h: 0, suspectedDeath24h: 0, serumSent24h: 0,
            reportCount: 0
          },
          breakdown: {},
          temporal: {
            dataDate: effectiveDate || today,
            isHistorical: false,
            publishTime: outbreak ? `${String(outbreak.publishTimeHour).padStart(2, '0')}:${String(outbreak.publishTimeMinute).padStart(2, '0')}` : null
          }
        };
      }

      // 0. Trigger Auto-Publish if applicable
      await autoPublishReports(outbreakId);

      const validDate = (d: string | null) => d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
      const vDate = validDate(effectiveDate);
      const vFrom = validDate(fromQuery);
      const vTo = validDate(effectiveTo);

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

      // Shared filter conditions for consistency
      const whereClause = Prisma.sql`
        WHERE r."outbreakId" = ${outbreakId}
          AND (r.status = 'PUBLISHED' OR (${isAdmin} AND r.status = 'SUBMITTED'))
          AND (${vDate}::text IS NULL OR r."periodStart"::date = ${vDate}::date)
          AND (${vFrom}::text IS NULL OR r."periodStart"::date >= ${vFrom}::date)
          AND (${vTo}::text IS NULL OR r."periodStart"::date <= ${vTo}::date)
          AND (${division}::text = '' OR f.division = ${division})
          AND (${district}::text = '' OR f.district = ${district})
      `;

      // --- National Totals ---
      const totalsResult: any[] = await prisma.$queryRaw`
        SELECT
          ${Prisma.join(aggSql, ', ')},
          COUNT(r.id)::int AS "reportCount"
        FROM "Report" r
        JOIN "Facility" f ON f.id = r."facilityId"
        ${whereClause}
      `;

      // --- Division/District Breakdown ---
      let groupByCol: string;
      if (groupBy === 'district') groupByCol = 'f.district';
      else if (groupBy === 'facility') groupByCol = 'f."facilityName"';
      else if (district) groupByCol = 'f."facilityName"';
      else if (division) groupByCol = 'f.district';
      else groupByCol = 'f.division';

      const breakdownResult: any[] = await prisma.$queryRaw`
        SELECT
          ${Prisma.raw(groupByCol)} AS "groupKey",
          ${Prisma.join(aggSql, ', ')},
          COUNT(r.id)::int AS "reportCount"
        FROM "Report" r
        JOIN "Facility" f ON f.id = r."facilityId"
        ${whereClause}
        GROUP BY ${Prisma.raw(groupByCol)}
        ORDER BY ${Prisma.raw(`"${fieldsToAggregate[0]}"`)} DESC
      `;

      const t = totalsResult[0] || {};
      const totalsResource: Record<string, number> = {};
      fieldsToAggregate.forEach(key => {
        totalsResource[key] = Number(t[key]) || 0;
      });

      const breakdownResource: Record<string, any> = {};
      for (const row of breakdownResult) {
        if (!row.groupKey) continue;
        const rowData: Record<string, number> = {};
        fieldsToAggregate.forEach(key => {
          rowData[key] = Number(row[key]) || 0;
        });
        breakdownResource[row.groupKey] = rowData;
      }

      return {
        totals: totalsResource,
        breakdown: breakdownResource,
        debug: { reportCount: Number(t.reportCount) || 0 }
      };
    }, 900); // 15 mins cache

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Summary API Error]', error);
    return NextResponse.json({ error: 'Aggregation failed', details: error.message }, { status: 500 });
  }
}
