import { prisma } from "./prisma";
import { getBdTime, getBdDateString } from "./timezone";
import { ReportStatus } from "@prisma/client";

/**
 * Ensures that all reports that should be published are marked as PUBLISHED.
 * A report is auto-published if:
 * 1. Its status is SUBMITTED or DRAFT (depending on policy).
 * 2. The publishTime for its reporting date has passed.
 */
export async function autoPublishReports(outbreakId: string) {
  const outbreak = await prisma.outbreak.findUnique({
    where: { id: outbreakId },
    select: { 
      publishTimeHour: true, 
      publishTimeMinute: true 
    }
  });

  if (!outbreak) return;

  const now = getBdTime();
  const todayStr = getBdDateString(now);
  
  // Logic: 
  // If we are looking at a report for Date D.
  // It should be published if (currentDate > D) 
  // OR (currentDate == D AND currentTime >= publishTime).

  // 1. Publish everything from PREVIOUS days that isn't published yet
  await prisma.report.updateMany({
    where: {
      outbreakId,
      status: { in: [ReportStatus.SUBMITTED] },
      periodStart: { lt: new Date(todayStr) }
    },
    data: {
      status: ReportStatus.PUBLISHED,
      publishedAt: now
    }
  });

  // 2. Publish TODAY'S reports if we are past the publish time
  const publishTime = new Date(now);
  publishTime.setHours(outbreak.publishTimeHour, outbreak.publishTimeMinute, 0, 0);

  if (now >= publishTime) {
    await prisma.report.updateMany({
      where: {
        outbreakId,
        status: { in: [ReportStatus.SUBMITTED] },
        periodStart: {
          gte: new Date(todayStr),
          lt: new Date(new Date(todayStr).getTime() + 24 * 60 * 60 * 1000)
        }
      },
      data: {
        status: ReportStatus.PUBLISHED,
        publishedAt: now
      }
    });
  }
}
