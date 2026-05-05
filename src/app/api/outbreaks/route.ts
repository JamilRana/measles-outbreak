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

import { CreateOutbreakSchema } from "@/lib/validations/outbreak";
import { validateRequest } from "@/lib/validations/api";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role, 'outbreak:manage')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validation = await validateRequest(CreateOutbreakSchema, body);
    
    if (!validation.success) {
      return validation.response;
    }

    const { 
      name, diseaseId, startDate, endDate, status, isActive, 
      allowBacklogReporting, backlogStartDate, backlogEndDate,
      reportingFrequency, submissionOpen, submissionCutoff, editDeadline, publishTime,
      hasDashboard, targetDivisions, targetDistricts, targetFacilityTypeIds
    } = validation.data;

    console.log("Creating outbreak with data:", {
      name, diseaseId, startDate, status, isActive
    });

    const outbreak = await prisma.outbreak.create({
      data: {
        name,
        disease: { connect: { id: diseaseId } },
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        status,
        isActive,
        allowBacklogReporting,
        backlogStartDate: (allowBacklogReporting && backlogStartDate) ? new Date(backlogStartDate) : null,
        backlogEndDate: (allowBacklogReporting && backlogEndDate) ? new Date(backlogEndDate) : null,
        reportingFrequency,
        submissionOpenHour: submissionOpen ? parseInt(submissionOpen.split(':')[0]) : 0,
        submissionOpenMinute: submissionOpen ? parseInt(submissionOpen.split(':')[1]) : 0,
        cutoffHour: submissionCutoff ? parseInt(submissionCutoff.split(':')[0]) : 14,
        cutoffMinute: submissionCutoff ? parseInt(submissionCutoff.split(':')[1]) : 0,
        editDeadlineHour: editDeadline ? parseInt(editDeadline.split(':')[0]) : 10,
        editDeadlineMinute: editDeadline ? parseInt(editDeadline.split(':')[1]) : 0,
        publishTimeHour: publishTime ? parseInt(publishTime.split(':')[0]) : 9,
        publishTimeMinute: publishTime ? parseInt(publishTime.split(':')[1]) : 0,
        hasDashboard,
        targetDivisions,
        targetDistricts,
        targetFacilityTypeIds,
      } as any,
    });

    return NextResponse.json(outbreak, { status: 201 });
  } catch (error: any) {
    console.error("Create outbreak error:", error);
    
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "An outbreak with this name already exists" }, { status: 400 });
    }
    
    if (error.code === 'P2025') {
      return NextResponse.json({ error: "The selected disease was not found in the database" }, { status: 400 });
    }

    return NextResponse.json({ 
      error: "Failed to create outbreak", 
      details: error.message 
    }, { status: 500 });
  }
}
