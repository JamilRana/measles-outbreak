import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const modernCount = await prisma.report.count();
  const legacyCount = await prisma.dailyReport.count();

  console.log('Modern Reports (Report):', modernCount);
  console.log('Legacy Reports (DailyReport):', legacyCount);

  if (modernCount > 0) {
    const firstModern = await prisma.report.findFirst({ select: { id: true, periodStart: true } });
    console.log('Sample Modern Report:', firstModern);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
