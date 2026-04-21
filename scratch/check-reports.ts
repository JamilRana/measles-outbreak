import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const reports = await prisma.dailyReport.groupBy({
    by: ['reportingDate'],
    _count: true,
    orderBy: { reportingDate: 'asc' }
  });

  console.log('Report counts by date:');
  reports.forEach(r => {
    console.log(`${r.reportingDate.toISOString().split('T')[0]}: ${r._count}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
