const { PrismaClient, ReportStatus } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTotalSuspected() {
  const dateStr = '2026-04-07';
  const start = new Date(dateStr);
  const end = new Date(start.getTime() + 86400000);

  const [modern, legacy] = await Promise.all([
    prisma.report.findMany({
      where: { status: ReportStatus.PUBLISHED, periodStart: { gte: start, lt: end } },
      select: { facilityId: true, dataSnapshot: true }
    }),
    prisma.dailyReport.findMany({
      where: { reportingDate: { gte: start, lt: end } }
    })
  ]);

  const processed = new Set();
  let totalField = 0;

  modern.forEach((r: any) => {
    if (processed.has(r.facilityId)) return;
    processed.add(r.facilityId);
    totalField += (r.dataSnapshot?.suspected24h || 0);
  });

  legacy.forEach((r: any) => {
    if (processed.has(r.facilityId)) return;
    processed.add(r.facilityId);
    totalField += (r.suspected24h || 0);
  });

  console.log(`Total Suspected (All Divisions) for ${dateStr}: ${totalField}`);
}

checkTotalSuspected().catch(console.error).finally(() => prisma.$disconnect());
