import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    // Public access for outbreak enumeration (needed for reporting)
    
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const diseaseId = searchParams.get("diseaseId");
    const onlyActive = searchParams.get("active") === 'true';

    const where: any = {};
    if (status) where.status = status;
    if (diseaseId) where.diseaseId = diseaseId;
    if (onlyActive) where.isActive = true;

    const outbreaks = await prisma.outbreak.findMany({
      where,
      include: {
        disease: {
          select: { name: true, code: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(outbreaks);
  } catch (error) {
    console.error("Fetch outbreaks error:", error);
    return NextResponse.json({ error: "Failed to fetch outbreaks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role, 'outbreak:manage')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { 
      name, diseaseId, startDate, endDate, status, isActive, 
      allowBacklogReporting, backlogStartDate, backlogEndDate
    } = body;

    if (!name || !diseaseId || !startDate) {
      return NextResponse.json({ error: "Name, Disease, and Start Date are required" }, { status: 400 });
    }

    const outbreak = await prisma.outbreak.create({
      data: {
        name,
        diseaseId,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        status: status || 'DRAFT',
        isActive: isActive ?? true,
        allowBacklogReporting: allowBacklogReporting ?? false,
        backlogStartDate: (allowBacklogReporting && backlogStartDate) ? new Date(backlogStartDate) : null,
        backlogEndDate: (allowBacklogReporting && backlogEndDate) ? new Date(backlogEndDate) : null,
        reportingFrequency: body.reportingFrequency || 'DAILY',
        cutoffHour: body.submissionCutoff ? parseInt(body.submissionCutoff.split(':')[0]) : 14,
        cutoffMinute: body.submissionCutoff ? parseInt(body.submissionCutoff.split(':')[1]) : 0,
        editDeadlineHour: body.editDeadline ? parseInt(body.editDeadline.split(':')[0]) : 10,
        editDeadlineMinute: body.editDeadline ? parseInt(body.editDeadline.split(':')[1]) : 0,
        publishTimeHour: body.publishTime ? parseInt(body.publishTime.split(':')[0]) : 9,
        publishTimeMinute: body.publishTime ? parseInt(body.publishTime.split(':')[1]) : 0,
        targetDivisions: body.targetDivisions || [],
        targetDistricts: body.targetDistricts || [],
        targetFacilityTypeIds: body.targetFacilityTypeIds || [],
      },
    });

    return NextResponse.json(outbreak, { status: 201 });
  } catch (error) {
    console.error("Create outbreak error:", error);
    if ((error as any).code === 'P2002') {
      return NextResponse.json({ error: "Outbreak name already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create outbreak" }, { status: 500 });
  }
}
