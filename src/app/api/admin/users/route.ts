import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendUserCreatedEmail, sendAccountStatusEmail } from "@/lib/mail";
import { createAuditLog, AuditActions } from "@/lib/audit";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        facility: {
          include: {
            facilityTypeRel: true
          }
        }
      },
    });

    return NextResponse.json(users.map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
      facilityId: u.facilityId,
      facilityName: u.facility?.facilityName || "N/A",
      facilityCode: u.facility?.facilityCode || "N/A",
      facilityType: u.facility?.facilityTypeRel?.name || u.facility?.facilityType || "N/A",
      division: u.facility?.division || "N/A",
      district: u.facility?.district || "N/A",
      managedDivisions: u.managedDivisions,
      managedDistricts: u.managedDistricts
    })));
  } catch (error) {
    console.error("Fetch users error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { 
      email, password, role, name,
      facilityId, // New: Link to existing facility
      managedDivisions = [],
      managedDistricts = []
    } = await req.json();

    if (!email || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    const nameToUse = name || email.split('@')[0];

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: nameToUse,
        nameNormalized: nameToUse.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        role,
        facilityId: facilityId || null,
        managedDivisions,
        managedDistricts,
        isActive: true,
      },
      include: { facility: true }
    });

    // AUDIT LOG
    await createAuditLog({
      userId: session.user.id,
      action: AuditActions.USER_CREATE,
      entityType: "USER",
      entityId: user.id,
      details: { email: user.email, role: user.role, facilityId: user.facilityId }
    });

    if (email && password) {
      await sendUserCreatedEmail(email, password, user.facility?.facilityName || "National / Administrative", role);
    }

    return NextResponse.json({ id: user.id, email: user.email, role: user.role }, { status: 201 });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { 
      id, role, password, isActive, name, email,
      facilityId, managedDivisions, managedDistricts
    } = await req.json();
    
    const userToUpdate = await prisma.user.findUnique({ where: { id } });
    if (!userToUpdate) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const updateData: any = {};
    if (role) updateData.role = role;
    if (password) updateData.password = await bcrypt.hash(password, 10);
    if (isActive !== undefined) updateData.isActive = isActive;
    if (name) {
      updateData.name = name;
      updateData.nameNormalized = name.toLowerCase().replace(/[^a-z0-9]/g, "_");
    }
    if (email) updateData.email = email;
    if (facilityId !== undefined) updateData.facilityId = facilityId; // null to unlink
    if (managedDivisions) updateData.managedDivisions = managedDivisions;
    if (managedDistricts) updateData.managedDistricts = managedDistricts;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { facility: true },
    });

    // AUDIT LOG
    await createAuditLog({
      userId: session.user.id,
      action: AuditActions.USER_UPDATE,
      entityType: "USER",
      entityId: user.id,
      details: { 
        changes: Object.keys(updateData).filter(k => k !== 'password'),
        isActive: user.isActive 
      }
    });

    if (isActive !== undefined && user.facility) {
      await sendAccountStatusEmail(user.email, user.facility.facilityName, isActive);
    }
    
    return NextResponse.json({ id: user.id, email: user.email, role: user.role, isActive: user.isActive });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const user = await prisma.user.delete({ where: { id } });

    // AUDIT LOG
    await createAuditLog({
      userId: session.user.id,
      action: AuditActions.USER_DELETE,
      entityType: "USER",
      entityId: id,
      details: { email: user.email }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}