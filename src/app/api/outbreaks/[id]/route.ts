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
    const { name, diseaseId, startDate, endDate, status, isActive, allowBacklogReporting, backlogStartDate, backlogEndDate } = body;

    const outbreak = await prisma.outbreak.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(diseaseId && { diseaseId }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(status && { status }),
        ...(isActive !== undefined && { isActive }),
        ...(allowBacklogReporting !== undefined && { allowBacklogReporting }),
        ...(backlogStartDate !== undefined && { backlogStartDate: backlogStartDate ? new Date(backlogStartDate) : null }),
        ...(backlogEndDate !== undefined && { backlogEndDate: backlogEndDate ? new Date(backlogEndDate) : null }),
      },
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
    const reportCount = await prisma.dailyReport.count({
      where: { outbreakId: id }
    });

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