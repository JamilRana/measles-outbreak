const { PrismaClient, ReportStatus } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSummaryApiLogic() {
  const dateStr = '2026-04-07';
  const outbreakId = 'measles-2026';
  const start = new Date(dateStr);
  const end = new Date(start.getTime() + 86400000);

  console.log(`Analyzing Summary API logic for Dhaka on ${dateStr}...`);

  const [modernReports, legacyReports] = await Promise.all([
    prisma.report.findMany({
      where: {
        outbreakId,
        status: ReportStatus.PUBLISHED,
        periodStart: { gte: start, lt: end },
        facility: { division: 'Dhaka' }
      },
      select: {
        facilityId: true,
        dataSnapshot: true
      }
    }),
    prisma.dailyReport.findMany({
      where: {
        outbreakId,
        reportingDate: { gte: start, lt: end },
        facility: { division: 'Dhaka' }
      }
    })
  ]);

  const agg: any = { suspected24h: 0, confirmed24h: 0, admitted24h: 0, discharged24h: 0, suspectedDeath24h: 0, confirmedDeath24h: 0 };
  const processed = new Set();

  const updateAgg = (facilityId: string, data: any) => {
    if (processed.has(facilityId)) return;
    processed.add(facilityId);

    agg.suspected24h += (Number(data.suspected24h) || 0);
    agg.confirmed24h += (Number(data.confirmed24h) || 0);
    agg.admitted24h += (Number(data.admitted24h) || 0);
    agg.discharged24h += (Number(data.discharged24h || data.recovered24h) || 0);
    agg.suspectedDeath24h += (Number(data.suspectedDeath24h) || 0);
    agg.confirmedDeath24h += (Number(data.confirmedDeath24h) || 0);
  };

  modernReports.forEach((r: any) => updateAgg(r.facilityId, r.dataSnapshot || {}));
  legacyReports.forEach((r: any) => updateAgg(r.facilityId, r));

  console.log('Result for Dhaka:', agg);
  console.log('Processed unique facilities:', processed.size);
}

checkSummaryApiLogic().catch(console.error).finally(() => prisma.$disconnect());
