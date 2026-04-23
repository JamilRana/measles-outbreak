import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role, 'report:lock')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { lock } = await req.json();

    const report = await prisma.report.update({
      where: { id },
      data: { isLocked: !!lock },
      include: { facility: true }
    });

    await createAuditLog({
      userId: session.user.id,
      action: lock ? "REPORT_LOCK" : "REPORT_UNLOCK",
      entityType: "Report",
      entityId: id,
      details: { facilityName: report.facility?.facilityName },
    });

    return NextResponse.json({ success: true, isLocked: report.isLocked });
  } catch (error) {
    console.error("Lock report error:", error);
    return NextResponse.json({ error: "Failed to update lock status" }, { status: 500 });
  }
}
