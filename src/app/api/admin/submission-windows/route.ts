import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";

/**
 * GET /api/admin/submission-windows
 * 
 * List submission windows, optionally filtered by outbreakId.
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role, 'settings:manage')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const outbreakId = searchParams.get("outbreakId");

    const windows = await prisma.submissionWindow.findMany({
      where: outbreakId ? { outbreakId } : undefined,
      include: {
        outbreak: { select: { name: true } },
        facility: { select: { facilityName: true, facilityCode: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(windows);
  } catch (error) {
    console.error("Fetch windows error:", error);
    return NextResponse.json({ error: "Failed to fetch windows" }, { status: 500 });
  }
}

/**
 * POST /api/admin/submission-windows
 * 
 * Create a new submission window with optional targeting.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role, 'settings:manage')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { 
      name, 
      outbreakId, 
      facilityId, 
      periodStart,
      periodEnd,
      opensAt,
      closesAt,
      note,
      isActive,
      targetDivisions,
      targetDistricts,
      targetFacilityTypeIds,
    } = body;

    if (!outbreakId || !periodStart || !periodEnd || !opensAt || !closesAt) {
      return NextResponse.json({ error: "outbreakId, periodStart, periodEnd, opensAt, closesAt are required" }, { status: 400 });
    }

    const window = await prisma.submissionWindow.create({
      data: {
        name: name || null,
        outbreakId,
        facilityId: facilityId || null,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        opensAt: new Date(opensAt),
        closesAt: new Date(closesAt),
        note: note || null,
        createdBy: session.user.id,
        isActive: isActive ?? true,
        targetDivisions: targetDivisions || [],
        targetDistricts: targetDistricts || [],
        targetFacilityTypeIds: targetFacilityTypeIds || [],
      }
    });

    return NextResponse.json(window, { status: 201 });
  } catch (error) {
    console.error("Create window error:", error);
    return NextResponse.json({ error: "Failed to create window" }, { status: 500 });
  }
}
