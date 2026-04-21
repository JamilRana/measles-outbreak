import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const dates = await prisma.report.findMany({
    select: { periodStart: true },
    distinct: ['periodStart'],
  });
  console.log('Unique dates in Report table:');
  dates.forEach(d => console.log(d.periodStart.toISOString()));

  const dailyDates = await prisma.dailyReport.findMany({
    select: { reportingDate: true },
    distinct: ['reportingDate'],
  });
  console.log('Unique dates in DailyReport table:');
  dailyDates.forEach(d => console.log(d.reportingDate.toISOString()));
}

main().catch(console.error).finally(() => prisma.$disconnect());
