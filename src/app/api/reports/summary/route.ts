import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getCachedData } from '@/lib/redis';
import { autoPublishReports } from '@/lib/publish-manager';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBdTime, getBdDateString, getLatestReportDate } from '@/lib/timezone';

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
    const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'EDITOR';
    
    // Default to the latest available published date if no date is provided
    const effectiveDate = dateQuery || getLatestReportDate();

    // Cache key depends on user role and date
    const cacheKey = `summary:${outbreakId}:${effectiveDate}:${fromQuery}:${toQuery}:${division}:${district}:${isAdmin ? 'admin' : 'public'}`;

    const data = await getCachedData(cacheKey, async () => {
      // 0. Trigger Auto-Publish if applicable
      await autoPublishReports(outbreakId);

      // Validate date formats
      const validDate = (d: string | null) => d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
      const vDate = validDate(effectiveDate);
      const vFrom = validDate(fromQuery);
      const vTo = validDate(toQuery);

      // 1. Fetch Outbreak Config for Publication Time
      const now = getBdTime();
      const outbreak = await prisma.outbreak.findUnique({
        where: { id: outbreakId },
        select: { publishTimeHour: true, publishTimeMinute: true }
      });
      
      const publishTime = new Date(now);
      if (outbreak) {
        publishTime.setHours(outbreak.publishTimeHour || 16, outbreak.publishTimeMinute || 0, 0, 0);
      }

      // PUBLIC USERS cannot see today's data until publishTime has passed.
      const isPastPublishTime = now >= publishTime;
      const effectiveIsPublished = Prisma.sql`(r.status = 'PUBLISHED' ${(!isAdmin && !isPastPublishTime) ? Prisma.sql`AND r."periodStart"::date < ${getBdDateString(now)}::date` : Prisma.empty})`;

      // 2. Fetch Core Fields for Dynamic Aggregation
      const coreFields = await prisma.formField.findMany({
        where: { outbreakId, isCoreField: true },
        select: { fieldKey: true }
      });

      const fallbackFields = [
        'suspected24h', 'confirmed24h', 'admitted24h', 'discharged24h',
        'confirmedDeath24h', 'suspectedDeath24h'
      ];
      
      const fieldsToAggregate = coreFields.length > 0 
        ? coreFields.map(f => f.fieldKey)
        : fallbackFields;

      // 3. National Totals with Publication Guard
      const [totalsRow]: any[] = await prisma.$queryRaw`
        SELECT 
          COUNT(r.id)::integer as "totalCount",
          COUNT(CASE WHEN ${effectiveIsPublished} THEN 1 END)::integer as "publishedCount",
          ${Prisma.join(
            fieldsToAggregate.map(key => 
              Prisma.sql`COALESCE(SUM(CASE WHEN ${effectiveIsPublished} THEN (COALESCE(NULLIF(r."dataSnapshot"->>${key}, '')::numeric, 0)) ELSE 0 END), 0) AS ${Prisma.raw(`"${key}"`)}`
            ), 
            ', '
          )}
        FROM "Report" r
        JOIN "Facility" f ON f.id = r."facilityId"
        WHERE r."outbreakId" = ${outbreakId}
          AND (${vDate}::text IS NULL OR r."periodStart"::date = ${vDate}::date)
          AND (${vFrom}::text IS NULL OR r."periodStart"::date >= ${vFrom}::date)
          AND (${vTo}::text IS NULL OR r."periodStart"::date <= ${vTo}::date)
          AND (${division ?? ''}::text = '' OR f.division = ${division ?? ''})
          AND (${district ?? ''}::text = '' OR f.district = ${district ?? ''})
      `;

      const totalsResource: Record<string, any> = {
        isPublished: (totalsRow?.publishedCount || 0) > 0,
        hasReports: (totalsRow?.totalCount || 0) > 0,
        reportCount: totalsRow?.publishedCount || 0
      };

      fieldsToAggregate.forEach(key => {
        totalsResource[key] = Number(totalsRow?.[key]) || 0;
      });

      // 4. Breakdown with Publication Guard
      let groupByCol: string;
      if (groupBy === 'district') groupByCol = 'f.district';
      else if (groupBy === 'facility') groupByCol = 'f."facilityName"';
      else if (district) groupByCol = 'f."facilityName"';
      else if (division) groupByCol = 'f.district';
      else groupByCol = 'f.division';

      const breakdownResult: any[] = await prisma.$queryRaw(
        Prisma.sql`
          SELECT
            ${Prisma.raw(groupByCol)} AS "groupKey",
            ${Prisma.join(
              fieldsToAggregate.map(key => 
                Prisma.sql`COALESCE(SUM(CASE WHEN ${effectiveIsPublished} THEN (COALESCE(NULLIF(r."dataSnapshot"->>${key}, '')::numeric, 0)) ELSE 0 END), 0) AS ${Prisma.raw(`"${key}"`)}`
              ),
              ', '
            )},
            COUNT(CASE WHEN ${effectiveIsPublished} THEN 1 END)::int AS "reportCount"
          FROM "Report" r
          JOIN "Facility" f ON f.id = r."facilityId"
          WHERE r."outbreakId" = ${outbreakId}
            AND (${vDate ?? ''}::text = '' OR r."periodStart"::date = ${vDate ?? ''}::date)
            AND (${vFrom ?? ''}::text = '' OR r."periodStart"::date >= ${vFrom ?? ''}::date)
            AND (${vTo ?? ''}::text = '' OR r."periodStart"::date <= ${vTo ?? ''}::date)
            AND (${division}::text = '' OR f.division = ${division})
            AND (${district}::text = '' OR f.district = ${district})
          GROUP BY ${Prisma.raw(groupByCol)}
          ORDER BY ${Prisma.raw(fieldsToAggregate[0])} DESC
        `
      );

      const breakdownResource: Record<string, any> = {};
      for (const row of breakdownResult) {
        if (!row.groupKey) continue;
        const rowData: Record<string, number> = { reportCount: row.reportCount };
        fieldsToAggregate.forEach(key => {
          rowData[key] = Number(row[key]) || 0;
        });
        breakdownResource[row.groupKey] = rowData;
      }

      return {
        totals: totalsResource,
        breakdown: breakdownResource,
        debug: { 
          dataDate: effectiveDate,
          isAdmin,
          isPastPublishTime
        }
      };
    }, 900); // 15 mins cache

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Summary API Error]', error);
    return NextResponse.json({ error: 'Aggregation failed', details: error.message }, { status: 500 });
  }
}
