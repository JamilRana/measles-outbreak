import { prisma } from "./prisma";
import { getBdTime, getBdDateString } from "./timezone";
import { ReportStatus } from "@prisma/client";

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
