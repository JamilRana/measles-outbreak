const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function publishSubmittedReports() {
  const dateStr = '2026-04-07';
  const start = new Date(dateStr);
  const end = new Date(start.getTime() + 86400000);

  console.log(`Publishing all SUBMITTED reports for Dhaka on ${dateStr}...`);

  const result = await prisma.report.updateMany({
    where: {
      periodStart: { gte: start, lt: end },
      status: 'SUBMITTED'
    },
    data: {
      status: 'PUBLISHED'
    }
  });

  console.log(`Successfully updated ${result.count} reports to PUBLISHED.`);
}

publishSubmittedReports().catch(console.error).finally(() => prisma.$disconnect());
