import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, AuditActions } from "@/lib/audit";
import { hasPermission } from "@/lib/rbac";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (!hasPermission(session.user.role, 'facility:manage') && !hasPermission(session.user.role, 'facility:view'))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const facilities = await prisma.facility.findMany({
      orderBy: { facilityName: "asc" },
      include: {
        facilityTypeRel: true,
        _count: {
          select: { users: true }
        }
      }
    });

    return NextResponse.json(facilities);
  } catch (error) {
    console.error("Fetch facilities error:", error);
    return NextResponse.json({ error: "Failed to fetch facilities" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, 'facility:manage')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { 
      facilityName, facilityCode, facilityTypeId, 
      division, district, upazila, phone, email, isActive 
    } = await req.json();

    if (!facilityName || !facilityCode || !division || !district) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const facility = await prisma.facility.create({
      data: {
        facilityName,
        facilityCode,
        facilityTypeId,
        division,
        district,
        upazila,
        phone,
        email,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    await createAuditLog({
      userId: session.user.id,
      action: AuditActions.FACILITY_CREATE,
      entityType: "FACILITY",
      entityId: facility.id,
      details: { name: facility.facilityName }
    });

    return NextResponse.json(facility, { status: 201 });
  } catch (error) {
    console.error("Create facility error:", error);
    return NextResponse.json({ error: "Failed to create facility" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, 'facility:manage')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { 
      id, facilityName, facilityCode, facilityTypeId, 
      division, district, upazila, phone, email, isActive 
    } = await req.json();

    const facility = await prisma.facility.update({
      where: { id },
      data: {
        facilityName,
        facilityCode,
        facilityTypeId,
        division,
        district,
        upazila,
        phone,
        email,
        isActive
      }
    });

    await createAuditLog({
      userId: session.user.id,
      action: AuditActions.FACILITY_UPDATE,
      entityType: "FACILITY",
      entityId: facility.id,
      details: { name: facility.facilityName }
    });

    return NextResponse.json(facility);
  } catch (error) {
    console.error("Update facility error:", error);
    return NextResponse.json({ error: "Failed to update facility" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session.user.role, 'facility:manage')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Facility ID is required" }, { status: 400 });
    }

    // Check for associated data
    const [userCount, reportCount, windowCount, slotCount] = await Promise.all([
      prisma.user.count({ where: { facilityId: id } }),
      prisma.report.count({ where: { facilityId: id } }),
      prisma.submissionWindow.count({ where: { facilityId: id } }),
      prisma.backlogSlot.count({ where: { facilityId: id } })
    ]);

    const totalDataPoints = userCount + reportCount + windowCount + slotCount;

    if (totalDataPoints > 0) {
      return NextResponse.json({ 
        error: "Cannot delete facility with existing data", 
        details: {
          users: userCount,
          reports: reportCount,
          scheduling: windowCount + slotCount
        }
      }, { status: 400 });
    }

    const facility = await prisma.facility.delete({
      where: { id }
    });

    await createAuditLog({
      userId: session.user.id,
      action: AuditActions.FACILITY_DELETE,
      entityType: "FACILITY",
      entityId: id,
      details: { name: facility.facilityName, code: facility.facilityCode }
    });

    return NextResponse.json({ message: "Facility deleted successfully" });
  } catch (error) {
    console.error("Delete facility error:", error);
    return NextResponse.json({ error: "Failed to delete facility" }, { status: 500 });
  }
}
