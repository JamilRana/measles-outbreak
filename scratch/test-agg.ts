import { PrismaClient, ReportStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const outbreakId = 'measles-2026';
  
  const [modernReports, legacyReports] = await Promise.all([
    prisma.report.findMany({
      where: { outbreakId, status: ReportStatus.PUBLISHED },
      select: { 
        id: true,
        periodStart: true,
        facilityId: true,
        dataSnapshot: true,
        facility: { select: { division: true, district: true, facilityName: true } }
      }
    }),
    prisma.dailyReport.findMany({
      where: { outbreakId },
      include: { facility: { select: { division: true, district: true, facilityName: true } } }
    })
  ]);

  console.log(`Modern count: ${modernReports.length}`);
  console.log(`Legacy count: ${legacyReports.length}`);

  const processedTags = new Set<string>();
  let totalSuspected = 0;
  let modernCount = 0;
  let legacyAddedCount = 0;

  modernReports.forEach(r => {
    const snap = r.dataSnapshot as any;
    const dateKey = r.periodStart.toISOString().split('T')[0];
    const tag = `${r.facilityId}_${dateKey}`;
    
    if (!processedTags.has(tag)) {
        processedTags.add(tag);
        totalSuspected += Number(snap?.suspected24h) || 0;
        modernCount++;
    }
  });

  legacyReports.forEach(r => {
    const dateKey = r.reportingDate.toISOString().split('T')[0];
    const tag = `${r.facilityId}_${dateKey}`;
    
    if (!processedTags.has(tag)) {
        processedTags.add(tag);
        totalSuspected += Number((r as any).suspected24h) || 0;
        legacyAddedCount++;
    } else {
        // This should log for every legacy report since we have modern counterparts
        // console.log(`Skipping duplicate tag: ${tag}`);
    }
  });

  console.log(`Total Suspected (De-duplicated): ${totalSuspected}`);
  console.log(`Modern added: ${modernCount}`);
  console.log(`Legacy added: ${legacyAddedCount}`);
  console.log(`Total Tags: ${processedTags.size}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
