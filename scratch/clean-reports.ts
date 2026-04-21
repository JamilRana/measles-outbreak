import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting to clean all reports...');

  try {
    // ReportFieldValue has onDelete: Cascade, so it should be cleaned automatically
    // but Prisma Client deleteMany might not trigger DB-level cascade if not configured correctly in relations
    // In schema.prisma, they are defined with onDelete: Cascade:
    // report         Report?      @relation(fields: [modernReportId], references: [id], onDelete: Cascade)
    // dailyReport    DailyReport? @relation(fields: [reportId], references: [id], onDelete: Cascade)

    const dailyReportCount = await prisma.dailyReport.count();
    const reportCount = await prisma.report.count();

    console.log(`Found ${dailyReportCount} DailyReports and ${reportCount} Reports.`);

    // Delete DailyReports
    const deletedDailyReports = await prisma.dailyReport.deleteMany({});
    console.log(`Deleted ${deletedDailyReports.count} DailyReports.`);

    // Delete Reports
    const deletedReports = await prisma.report.deleteMany({});
    console.log(`Deleted ${deletedReports.count} Reports.`);

    // Check if any ReportFieldValues are left (just in case cascade didn't catch everything)
    const fieldValuesCount = await prisma.reportFieldValue.count();
    if (fieldValuesCount > 0) {
      console.log(`Cleaning up ${fieldValuesCount} orphaned ReportFieldValues...`);
      await prisma.reportFieldValue.deleteMany({});
    }

    console.log('Cleanup completed successfully.');
  } catch (error) {
    console.error('Error cleaning reports:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
