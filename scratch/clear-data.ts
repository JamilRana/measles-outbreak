import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const outbreakId = 'measles-2026';
  
  console.log('Aggressively cleaning up all reporting data...');

  try {
    // 1. Delete all report field values
    const fv = await prisma.reportFieldValue.deleteMany({});
    console.log(`Deleted ${fv.count} field values.`);

    // 2. Delete all records from Report
    const r = await prisma.report.deleteMany({});
    console.log(`Deleted ${r.count} reports.`);

    // 3. Delete all records from DailyReport (Legacy)
    const dr = await prisma.dailyReport.deleteMany({});
    console.log(`Deleted ${dr.count} daily reports.`);

    console.log('Cleanup successful.');
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
