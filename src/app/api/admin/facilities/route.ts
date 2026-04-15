import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, AuditActions } from "@/lib/audit";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
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
  if (!session || session.user.role !== "ADMIN") {
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
      action: "FACILITY_CREATE",
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
  if (!session || session.user.role !== "ADMIN") {
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
      action: "FACILITY_UPDATE",
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
