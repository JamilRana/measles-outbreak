import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, AuditActions } from "@/lib/audit";
import { ReportStatus } from "@prisma/client";
import { revalidateTag } from "next/cache";

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
    const existing = await prisma.report.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const isPublished = existing.status === ReportStatus.PUBLISHED;
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
      details: { from: existing.status, to: newStatus }
    });

    // Invalidate dashboard cache
    revalidateTag('dashboard', 'default');

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error("Publish toggle error:", error);
    return NextResponse.json({ error: "Failed to update publish status" }, { status: 500 });
  }
}
