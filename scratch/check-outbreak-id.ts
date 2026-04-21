import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const dr = await prisma.dailyReport.findFirst();
  console.log('DailyReport OutbreakId:', dr?.outbreakId);
  
  const r = await prisma.report.findFirst();
  console.log('Report OutbreakId:', r?.outbreakId);
}

main().catch(console.error).finally(() => prisma.$disconnect());
