import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, AuditActions } from "@/lib/audit";
import { ReportStatus } from "@prisma/client";

/**
 * POST /api/reports/[id]/publish
 * 
 * Toggles the publish status of a report.
 * For modern reports, transitions between SUBMITTED and PUBLISHED.
 * For legacy reports, toggles the boolean 'published' field.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  
  // ADMIN and EDITOR can publish/unpublish
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const isModern = await prisma.report.findUnique({ where: { id } });
    const isLegacy = !isModern ? await prisma.dailyReport.findUnique({ where: { id } }) : null;

    if (!isModern && !isLegacy) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (isModern) {
      const isPublished = isModern.status === ReportStatus.PUBLISHED;
      const newStatus = isPublished ? ReportStatus.SUBMITTED : ReportStatus.PUBLISHED;
      
      await prisma.report.update({
        where: { id },
        data: { 
          status: newStatus, 
          publishedAt: newStatus === ReportStatus.PUBLISHED ? new Date() : null 
        }
      });
      
      await createAuditLog({
        userId: session.user.id,
        action: newStatus === ReportStatus.PUBLISHED ? AuditActions.REPORT_PUBLISH : AuditActions.REPORT_UNPUBLISH,
        entityType: 'Report',
        entityId: id,
        details: { from: isModern.status, to: newStatus }
      });

      return NextResponse.json({ success: true, status: newStatus });
    } else {
      const isPublished = isLegacy?.published;
      const newPublished = !isPublished;
      
      await prisma.dailyReport.update({
        where: { id },
        data: { published: newPublished }
      });
      
      await createAuditLog({
        userId: session.user.id,
        action: newPublished ? AuditActions.REPORT_PUBLISH : AuditActions.REPORT_UNPUBLISH,
        entityType: 'DailyReport',
        entityId: id,
        details: { from: isPublished, to: newPublished }
      });

      return NextResponse.json({ success: true, published: newPublished });
    }
  } catch (error) {
    console.error("Publish toggle error:", error);
    return NextResponse.json({ error: "Failed to update publish status" }, { status: 500 });
  }
}
