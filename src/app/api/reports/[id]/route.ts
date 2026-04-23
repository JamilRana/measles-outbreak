import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, AuditActions } from "@/lib/audit";
import { rebuildSnapshot } from "@/lib/snapshot";
import { ReportStatus } from "@prisma/client";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        facility: true,
        outbreak: true,
        fieldValues: { include: { formField: true } }
      }
    });

    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // RBAC: ADMIN and EDITOR can edit any report. USER can only edit their own.
  if (session.user.role !== "ADMIN" && session.user.role !== "EDITOR" && session.user.role !== "USER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await req.json();

    const existing = await prisma.report.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (session.user.role === "USER" && existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden: Cannot edit others' reports" }, { status: 403 });
    }

    if (existing.isLocked && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Report is locked" }, { status: 403 });
    }

    const report = await prisma.$transaction(async (tx) => {
      // Optimized: Collect all values first
      const valuesToUpdate: Record<string, string> = { ...data.dynamicFields };
      
      const outbreakFields = await tx.formField.findMany({
        where: { outbreakId: existing.outbreakId }
      });

      for (const field of outbreakFields) {
        if (data[field.fieldKey] !== undefined) {
           valuesToUpdate[field.id] = String(data[field.fieldKey]);
        }
      }

      // 1. Batch delete existing values
      await tx.reportFieldValue.deleteMany({
        where: { reportId: id }
      });

      // 2. Batch create new values
      const fieldValuesData = Object.entries(valuesToUpdate).map(([formFieldId, value]) => ({
        reportId: id,
        formFieldId: formFieldId,
        value: String(value),
      }));

      if (fieldValuesData.length > 0) {
        await tx.reportFieldValue.createMany({ data: fieldValuesData });
      }

      const snapshot = await rebuildSnapshot(id, tx);
      return await tx.report.update({
        where: { id },
        data: { dataSnapshot: snapshot as any }
      });
    }, {
      timeout: 15000 // Increase timeout to 15s
    });

    await createAuditLog({
      userId: session.user.id,
      action: AuditActions.REPORT_UPDATE,
      entityType: 'Report',
      entityId: report.id,
      details: { updatedBy: session.user.role, status: (report as any).status },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("Report update error:", error);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const existing = await prisma.report.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    
    await prisma.report.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete report" }, { status: 500 });
  }
}