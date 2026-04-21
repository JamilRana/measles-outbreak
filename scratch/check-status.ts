const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStatusDiscrepancy() {
  const dateStr = '2026-04-07';
  const start = new Date(dateStr);
  const end = new Date(start.getTime() + 86400000);

  console.log(`Analyzing report status for Dhaka on ${dateStr}...`);

  const reports = await prisma.report.findMany({
    where: {
      periodStart: { gte: start, lt: end },
      facility: { division: 'Dhaka' }
    },
    select: { id: true, facilityId: true, status: true, dataSnapshot: true }
  });

  const statusCounts: any = {};
  let unpublishedSuspected = 0;

  reports.forEach((r: any) => {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    if (r.status !== 'PUBLISHED') {
      const sus = (r.dataSnapshot?.suspected24h || 0);
      unpublishedSuspected += sus;
      console.log(`Unpublished Report: ${r.id} (${r.facilityId}) Status: ${r.status}, Suspected: ${sus}`);
    }
  });

  console.log('\nStatus Registry:', statusCounts);
  console.log('Total Suspected in Unpublished reports:', unpublishedSuspected);
}

checkStatusDiscrepancy().catch(console.error).finally(() => prisma.$disconnect());
