import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";

/**
 * GET /api/admin/facility-types
 * 
 * Public-ish endpoint — returns the facility type lookup table.
 * Used by admin targeting multi-selects and dashboard filters.
 */
export async function GET(req: Request) {
  try {
    const facilityTypes = await prisma.facilityType.findMany({
      where: { isActive: true },
      orderBy: [{ tier: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        tier: true,
      }
    });

    return NextResponse.json(facilityTypes);
  } catch (error) {
    console.error("Fetch facility types error:", error);
    return NextResponse.json({ error: "Failed to fetch facility types" }, { status: 500 });
  }
}

/**
 * POST /api/admin/facility-types
 * 
 * Admin-only: create a new facility type.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role, 'settings:manage')) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, slug, tier } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
    }

    const facilityType = await prisma.facilityType.create({
      data: { name, slug, tier: tier || null }
    });

    return NextResponse.json(facilityType, { status: 201 });
  } catch (error) {
    console.error("Create facility type error:", error);
    if ((error as any).code === 'P2002') {
      return NextResponse.json({ error: "Facility type name or slug already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create facility type" }, { status: 500 });
  }
}
