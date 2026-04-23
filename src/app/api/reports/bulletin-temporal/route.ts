import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ReportStatus } from '@prisma/client';

/**
 * GET /api/reports/bulletin-temporal
 * 
 * Returns daily aggregated statistics for the bulletin.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const outbreakId = searchParams.get('outbreakId') || 'measles-2026';
    const to = searchParams.get('to');

    const end = to ? new Date(new Date(to).getTime() + 86400000 - 1) : new Date();

    const reports = await prisma.report.findMany({
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
    });

    const dailyStats: Record<string, any> = {};

    reports.forEach(r => {
      const snap = r.dataSnapshot as any;
      if (!snap) return;

      const dateKey = r.periodStart.toISOString().split('T')[0];

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

      dailyStats[dateKey].suspected24h += (Number(snap.suspected24h) || 0);
      dailyStats[dateKey].confirmed24h += (Number(snap.confirmed24h) || 0);
      dailyStats[dateKey].admitted24h += (Number(snap.admitted24h) || 0);
      dailyStats[dateKey].recovered24h += (Number(snap.discharged24h || snap.recovered24h) || 0);
      dailyStats[dateKey].suspectedDeath24h += (Number(snap.suspectedDeath24h) || 0);
      dailyStats[dateKey].confirmedDeath24h += (Number(snap.confirmedDeath24h) || 0);
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
