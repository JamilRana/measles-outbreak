import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, AuditActions } from "@/lib/audit";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await req.json();

    const existing = await prisma.dailyReport.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const report = await prisma.dailyReport.update({
      where: { id },
      data: {
        suspected24h: Number(data.suspected24h) || 0,
        confirmed24h: Number(data.confirmed24h) || 0,
        suspectedDeath24h: Number(data.suspectedDeath24h) || 0,
        confirmedDeath24h: Number(data.confirmedDeath24h) || 0,
        admitted24h: Number(data.admitted24h) || 0,
        discharged24h: Number(data.discharged24h) || 0,
        serumSent24h: Number(data.serumSent24h) || 0,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: AuditActions.REPORT_UPDATE,
      entityType: 'DailyReport',
      entityId: report.id,
      details: { 
        before: existing,
        after: report,
        updatedBy: session.user.role 
      },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("Report update error:", error);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}