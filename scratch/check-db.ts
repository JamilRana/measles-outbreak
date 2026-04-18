import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const outbreakId = 'measles-2026';
  const dateStr = '2026-04-17';
  const start = new Date(dateStr);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const modern = await prisma.report.findMany({
    where: { outbreakId, periodStart: { gte: start, lt: end } },
    select: { facilityId: true, periodStart: true }
  });

  const legacy = await prisma.dailyReport.findMany({
    where: { outbreakId, reportingDate: { gte: start, lt: end } },
    select: { facilityId: true, reportingDate: true }
  });

  console.log(`Modern count for 4/17: ${modern.length}`);
  console.log(`Legacy count for 4/17: ${legacy.length}`);

  const modernTags = new Set(modern.map(m => `${m.facilityId}_${m.periodStart.toISOString().split('T')[0]}`));
  const legacyTags = new Set(legacy.map(l => `${l.facilityId}_${l.reportingDate.toISOString().split('T')[0]}`));

  console.log(`Modern tags count: ${modernTags.size}`);
  console.log(`Legacy tags count: ${legacyTags.size}`);

  let overlap = 0;
  legacyTags.forEach(tag => {
    if (modernTags.has(tag)) overlap++;
  });

  console.log(`Overlap: ${overlap}`);

  if (overlap < modernTags.size) {
    console.log('\n--- Discrepancy Sample ---');
    const mSorted = Array.from(modernTags).sort();
    const lSorted = Array.from(legacyTags).sort();
    console.log('Modern 1st:', mSorted[0]);
    console.log('Legacy 1st:', lSorted[0]);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
