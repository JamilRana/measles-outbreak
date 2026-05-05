import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const outbreak = await prisma.outbreak.findUnique({
      where: { id },
      include: {
        disease: {
          select: { name: true, code: true }
        }
      },
    });

    if (!outbreak) {
      return NextResponse.json({ error: "Outbreak not found" }, { status: 404 });
    }

    return NextResponse.json(outbreak);
  } catch (error) {
    console.error("Fetch outbreak error:", error);
    return NextResponse.json({ error: "Failed to fetch outbreak" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role, 'outbreak:manage')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    
    const data: any = {};
    
    // Core fields
    if (body.name !== undefined) data.name = body.name;
    if (body.diseaseId !== undefined) {
      data.disease = { connect: { id: body.diseaseId } };
    }
    if (body.status !== undefined) data.status = body.status;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.reportingFrequency !== undefined) data.reportingFrequency = body.reportingFrequency;
    
    // Dates
    if (body.startDate) data.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null;
    
    // Backlog
    if (body.allowBacklogReporting !== undefined) data.allowBacklogReporting = body.allowBacklogReporting;
    if (body.backlogStartDate !== undefined) data.backlogStartDate = body.backlogStartDate ? new Date(body.backlogStartDate) : null;
    if (body.backlogEndDate !== undefined) data.backlogEndDate = body.backlogEndDate ? new Date(body.backlogEndDate) : null;

    // Time Mapping helpers (Frontend "HH:MM" -> DB hour/minute)
    const mapTime = (timeStr: string | undefined, hourKey: string, minuteKey: string) => {
      if (timeStr && timeStr.includes(':')) {
        const [h, m] = timeStr.split(':').map(Number);
        data[hourKey] = h;
        data[minuteKey] = m;
      }
    };

    mapTime(body.submissionOpen, 'submissionOpenHour', 'submissionOpenMinute');
    mapTime(body.submissionCutoff, 'cutoffHour', 'cutoffMinute');
    mapTime(body.editDeadline, 'editDeadlineHour', 'editDeadlineMinute');
    mapTime(body.publishTime, 'publishTimeHour', 'publishTimeMinute');

    if (body.hasDashboard !== undefined) data.hasDashboard = body.hasDashboard;

    // Targeting
    if (body.targetDivisions !== undefined) data.targetDivisions = body.targetDivisions;
    if (body.targetDistricts !== undefined) data.targetDistricts = body.targetDistricts;
    if (body.targetFacilityTypeIds !== undefined) data.targetFacilityTypeIds = body.targetFacilityTypeIds;

    const outbreak = await prisma.outbreak.update({
      where: { id },
      data
    });

    return NextResponse.json(outbreak);
  } catch (error) {
    console.error("Update outbreak error:", error);
    return NextResponse.json({ error: "Failed to update outbreak" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role, 'outbreak:manage')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Check if outbreak has reports
    const reportCount = await prisma.report.count({ where: { outbreakId: id } });

    if (reportCount > 0) {
      return NextResponse.json({ error: "Cannot delete outbreak with existing reports" }, { status: 400 });
    }

    await prisma.outbreak.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete outbreak error:", error);
    return NextResponse.json({ error: "Failed to delete outbreak" }, { status: 500 });
  }
}