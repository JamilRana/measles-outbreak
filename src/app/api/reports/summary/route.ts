import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ReportStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const outbreakId = searchParams.get('outbreakId') || 'measles-2026';
    const dateQuery = searchParams.get('date');
    const fromQuery = searchParams.get('from');
    const toQuery = searchParams.get('to');
    const division = searchParams.get('division');
    const district = searchParams.get('district');

    // 1. Geography Filter
    const facilityWhere: any = {};
    if (division) facilityWhere.division = division;
    if (district) facilityWhere.district = district;

    // 2. Date Ranges
    let modernDateFilter: any = null;
    let legacyDateFilter: any = null;

    if (dateQuery) {
      const start = new Date(dateQuery);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      modernDateFilter = { gte: start, lt: end };
      legacyDateFilter = { gte: start, lt: end };
    } else if (toQuery) {
      const end = new Date(new Date(toQuery).getTime() + 24 * 60 * 60 * 1000 - 1);
      modernDateFilter = { lte: end };
      legacyDateFilter = { lte: end };
      if (fromQuery) {
        const start = new Date(fromQuery);
        modernDateFilter.gte = start;
        legacyDateFilter.gte = start;
      }
    } else if (fromQuery) {
      modernDateFilter = { gte: new Date(fromQuery) };
      legacyDateFilter = { gte: new Date(fromQuery) };
    }

    // 3. Parallel Fetch
    const [modernReports, legacyReports] = await Promise.all([
      prisma.report.findMany({
        where: {
          outbreakId,
          status: ReportStatus.PUBLISHED,
          ...(modernDateFilter && { periodStart: modernDateFilter }),
          ...(Object.keys(facilityWhere).length > 0 && { facility: facilityWhere })
        },
        select: { 
          id: true,
          periodStart: true,
          facilityId: true,
          dataSnapshot: true,
          facility: { select: { division: true, district: true, facilityName: true } }
        }
      }),
      prisma.dailyReport.findMany({
        where: {
          outbreakId,
          ...(legacyDateFilter && { reportingDate: legacyDateFilter }),
          ...(Object.keys(facilityWhere).length > 0 && { facility: facilityWhere })
        },
        include: { facility: { select: { division: true, district: true, facilityName: true } } }
      })
    ]);

    // 4. De-duplicated Aggregation
    const totals: Record<string, number> = {};
    const breakdown: Record<string, Record<string, number>> = {};
    const processedTags = new Set<string>();

    const updateAgg = (facilityId: string, facility: any, date: Date, data: Record<string, any>) => {
      if (!facility || !facilityId) return;
      
      const dateKey = date.toISOString().split('T')[0];
      const tag = `${facilityId}_${dateKey}`;
      
      if (processedTags.has(tag)) return;
      processedTags.add(tag);

      // Determine grouping key
      let key = facility.division;
      if (district) key = facility.facilityName;
      else if (division) key = facility.district;
      
      if (!key) return;
      if (!breakdown[key]) breakdown[key] = {};
      
      Object.entries(data).forEach(([k, v]) => {
        const val = Number(v) || 0;
        totals[k] = (totals[k] || 0) + val;
        breakdown[key][k] = (breakdown[key][k] || 0) + val;
      });
    };

    // Prioritize Modern Table
    modernReports.forEach(r => {
      const snap = r.dataSnapshot as any;
      if (!snap) return;
      updateAgg(r.facilityId, r.facility, r.periodStart, snap);
    });

    // Backfill from Legacy Table
    legacyReports.forEach(r => {
      const keys = ['suspected24h', 'confirmed24h', 'suspectedDeath24h', 'confirmedDeath24h', 'admitted24h', 'discharged24h', 'serumSent24h'];
      const data: any = {};
      keys.forEach(k => { data[k] = (r as any)[k] || 0; });
      updateAgg(r.facilityId, r.facility, r.reportingDate, data);
    });

    return NextResponse.json({ 
      totals, 
      breakdown,
      debug: {
        modernCount: modernReports.length,
        legacyCount: legacyReports.length,
        processedTagsCount: processedTags.size
      }
    });
  } catch (error: any) {
    console.error('[Summary API Error]', error);
    return NextResponse.json({ error: 'Aggregation failed' }, { status: 500 });
  }
}
