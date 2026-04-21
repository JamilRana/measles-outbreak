import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const groups = await prisma.dailyReport.groupBy({
    by: ['outbreakId'],
    _count: true
  });
  console.log('DailyReport groups by outbreakId:', groups);
}

main().catch(console.error).finally(() => prisma.$disconnect());
