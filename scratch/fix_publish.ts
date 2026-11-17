import { PrismaClient, ReportStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Running fix script for outbreak settings and publishing...');

  const outbreakId = 'measles-2026';

  // 1. Update Outbreak Settings
  const updatedOutbreak = await prisma.outbreak.update({
    where: { id: outbreakId },
    data: {
      editDeadlineHour: 10,
      cutoffHour: 10,
      publishTimeHour: 14,
      updatedAt: new Date()
    }
  });
  console.log(`✅ Updated Outbreak ${outbreakId}: editDeadline=10am, cutoff=10am, publish=2pm`);

  // 2. Auto-publish today's reports
  // (Ported logic from publish-manager to avoid import issues in scratch script)
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" }));
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  console.log(`📅 BD Time: ${now.toString()}`);
  console.log(`📅 Today String: ${todayStr}`);

  // Publish everything from previous days
  const prevResult = await prisma.report.updateMany({
    where: {
      outbreakId,
      status: 'SUBMITTED',
      periodStart: { lt: new Date(todayStr) }
    },
    data: {
      status: 'PUBLISHED',
      publishedAt: now
    }
  });
  console.log(`✅ Auto-published ${prevResult.count} reports from previous days.`);

  // Publish today's reports (since it's 7pm, definitely past 2pm)
  const todayResult = await prisma.report.updateMany({
    where: {
      outbreakId,
      status: 'SUBMITTED',
      periodStart: {
        gte: new Date(todayStr),
        lt: new Date(new Date(todayStr).getTime() + 24 * 60 * 60 * 1000)
      }
    },
    data: {
      status: 'PUBLISHED',
      publishedAt: now
    }
  });
  console.log(`✅ Auto-published ${todayResult.count} reports for today (${todayStr}).`);

  console.log('✨ Fix script completed.');
}

main()
  .catch(e => {
    console.error('❌ Fix script failed:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
