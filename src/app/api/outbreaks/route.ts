import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const diseaseId = searchParams.get("diseaseId");

    const where: any = { isActive: true };
    if (status) where.status = status;
    if (diseaseId) where.diseaseId = diseaseId;

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

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role, 'outbreak:manage')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id, allowBacklogReporting, backlogStartDate, backlogEndDate, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "Outbreak ID required" }, { status: 400 });
    }

    const outbreak = await prisma.outbreak.update({
      where: { id },
      data: {
        ...updateData,
        ...(allowBacklogReporting !== undefined && { allowBacklogReporting }),
        ...(backlogStartDate && { backlogStartDate: new Date(backlogStartDate) }),
        ...(backlogEndDate && { backlogEndDate: new Date(backlogEndDate) }),
      },
    });

    return NextResponse.json(outbreak);
  } catch (error) {
    console.error("Update outbreak error:", error);
    return NextResponse.json({ error: "Failed to update outbreak" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role, 'outbreak:manage')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, diseaseId, startDate, endDate, status, isActive, allowBacklogReporting, backlogStartDate, backlogEndDate } = body;

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
        backlogStartDate: allowBacklogReporting && backlogStartDate ? new Date(backlogStartDate) : null,
        backlogEndDate: allowBacklogReporting && backlogEndDate ? new Date(backlogEndDate) : null,
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
