import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const reports = await prisma.dailyReport.findMany({
      select: { reportingDate: true }
  });

  const counts: Record<string, number> = {};
  reports.forEach(r => {
    const key = r.reportingDate.toISOString().split('T')[0];
    counts[key] = (counts[key] || 0) + 1;
  });

  console.log('DailyReport counts by date:');
  Object.keys(counts).sort().forEach(date => {
    console.log(`${date}: ${counts[date]}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
