import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getCachedData, invalidateByPattern } from "@/lib/redis";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status") || "any";
    const diseaseId = searchParams.get("diseaseId") || "any";
    const onlyActive = searchParams.get("active") === 'true';

    // Granular cache key based on filters
    const cacheKey = `outbreaks:status=${status}:disease=${diseaseId}:active=${onlyActive}`;

    const outbreaks = await getCachedData(cacheKey, async () => {
      const where: any = {};
      if (status !== "any") where.status = status;
      if (diseaseId !== "any") where.diseaseId = diseaseId;
      if (onlyActive) where.isActive = true;

      return await prisma.outbreak.findMany({
        where,
        include: {
          disease: {
            select: { name: true, code: true }
          }
        },
        orderBy: { createdAt: "desc" },
      });
    }, 120); // 2 minute safety TTL

    return NextResponse.json(outbreaks);

  } catch (error: any) {
    console.error("🔴 [ERROR] Fetch outbreaks failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch outbreaks", details: error?.message },
      { status: 500 }
    );
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

    // Active Invalidation
    await invalidateByPattern('outbreaks:*');

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
