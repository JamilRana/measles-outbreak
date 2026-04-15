import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";

/**
 * GET /api/admin/backlog-slots
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role, 'settings:manage')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const outbreakId = searchParams.get("outbreakId");

    const slots = await prisma.backlogSlot.findMany({
      where: outbreakId ? { outbreakId } : undefined,
      include: {
        outbreak: { select: { name: true } },
        facility: { select: { facilityName: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(slots);
  } catch (error) {
    console.error("Fetch slots error:", error);
    return NextResponse.json({ error: "Failed to fetch slots" }, { status: 500 });
  }
}

/**
 * POST /api/admin/backlog-slots
 * 
 * Create a backlog slot with optional targeting.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role, 'settings:manage')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { 
      outbreakId, 
      facilityId, 
      periodStart,
      periodEnd,
      opensAt, 
      closesAt, 
      reason,
      targetDivisions,
      targetDistricts,
      targetFacilityTypeIds,
    } = body;

    if (!outbreakId || !periodStart || !periodEnd || !opensAt || !closesAt) {
      return NextResponse.json({ error: "outbreakId, periodStart, periodEnd, opensAt, closesAt are required" }, { status: 400 });
    }

    const slot = await prisma.backlogSlot.create({
      data: {
        outbreakId,
        facilityId: facilityId || null,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        opensAt: new Date(opensAt),
        closesAt: new Date(closesAt),
        reason: reason || "Administrative override",
        createdBy: session.user.id,
        targetDivisions: targetDivisions || [],
        targetDistricts: targetDistricts || [],
        targetFacilityTypeIds: targetFacilityTypeIds || [],
      }
    });

    return NextResponse.json(slot, { status: 201 });
  } catch (error) {
    console.error("Create backlog slot error:", error);
    return NextResponse.json({ error: "Failed to create backlog slot" }, { status: 500 });
  }
}
