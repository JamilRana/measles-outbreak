import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ReportStatus } from '@prisma/client';

/**
 * GET /api/reports/bulletin-temporal
 * 
 * Returns daily aggregated statistics for the bulletin.
 * Properly de-duplicates between modern and legacy records.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const outbreakId = searchParams.get('outbreakId') || 'measles-2026';
    const to = searchParams.get('to');

    const end = to ? new Date(new Date(to).getTime() + 86400000 - 1) : new Date();

    const [modernReports, legacyReports] = await Promise.all([
      prisma.report.findMany({
        where: {
          outbreakId,
          status: ReportStatus.PUBLISHED,
          periodStart: { lte: end }
        },
        select: {
          facilityId: true,
          periodStart: true,
          dataSnapshot: true
        }
      }),
      prisma.dailyReport.findMany({
        where: {
          outbreakId,
          reportingDate: { lte: end }
        },
        select: {
          facilityId: true,
          reportingDate: true,
          suspected24h: true,
          confirmed24h: true,
          admitted24h: true,
          discharged24h: true,
          suspectedDeath24h: true,
          confirmedDeath24h: true
        }
      })
    ]);

    const dailyStats: Record<string, any> = {};
    const processedTags = new Set<string>();

    const updateDaily = (facilityId: string, date: Date, data: any) => {
      const dateKey = date.toISOString().split('T')[0];
      const tag = `${facilityId}_${dateKey}`;
      if (processedTags.has(tag)) return;
      processedTags.add(tag);

      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = {
          date: dateKey,
          suspected24h: 0,
          confirmed24h: 0,
          admitted24h: 0,
          recovered24h: 0,
          suspectedDeath24h: 0,
          confirmedDeath24h: 0
        };
      }

      dailyStats[dateKey].suspected24h += (Number(data.suspected24h) || 0);
      dailyStats[dateKey].confirmed24h += (Number(data.confirmed24h) || 0);
      dailyStats[dateKey].admitted24h += (Number(data.admitted24h) || 0);
      dailyStats[dateKey].recovered24h += (Number(data.discharged24h || data.recovered24h) || 0);
      dailyStats[dateKey].suspectedDeath24h += (Number(data.suspectedDeath24h) || 0);
      dailyStats[dateKey].confirmedDeath24h += (Number(data.confirmedDeath24h) || 0);
    };

    // Process Modern
    modernReports.forEach(r => {
      const snap = r.dataSnapshot as any;
      if (!snap) return;
      updateDaily(r.facilityId, r.periodStart, snap);
    });

    // Process Legacy
    legacyReports.forEach(r => {
      updateDaily(r.facilityId, r.reportingDate, r);
    });

    // Sort Descending and Calculate Cumulatives
    const sortedDates = Object.keys(dailyStats).sort((a, b) => b.localeCompare(a));
    const sortedAsc = [...sortedDates].reverse();
    
    let cS = 0, cC = 0, cA = 0, cR = 0, cSD = 0, cCD = 0;
    const history: any[] = [];
    
    // Pass 1: Build map for cumulative calculation
    const log: Record<string, any> = {};
    sortedAsc.forEach(d => {
      cS += dailyStats[d].suspected24h;
      cC += dailyStats[d].confirmed24h;
      cA += dailyStats[d].admitted24h;
      cR += dailyStats[d].recovered24h;
      cSD += dailyStats[d].suspectedDeath24h;
      cCD += dailyStats[d].confirmedDeath24h;
      
      log[d] = {
        ...dailyStats[d],
        suspectedCum: cS,
        confirmedCum: cC,
        admittedCum: cA,
        recoveredCum: cR,
        suspectedDeathCum: cSD,
        confirmedDeathCum: cCD
      };
    });

    const items = sortedDates.map(d => log[d]);

    return NextResponse.json({
      history: items,
      count: items.length
    });

  } catch (error) {
    console.error('[Bulletin Temporal API Error]', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
