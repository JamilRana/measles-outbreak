import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendUserCreatedEmail, sendAccountStatusEmail } from "@/lib/mail";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        facility: true
      },
    });
    return NextResponse.json(users.map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      isActive: u.isActive,
      emailVerified: u.emailVerified,
      createdAt: u.createdAt,
      facilityId: u.facilityId,
      facilityName: u.facility?.facilityName || "N/A",
      facilityCode: u.facility?.facilityCode || "N/A",
      facilityType: u.facility?.facilityType || "N/A",
      division: u.facility?.division || "N/A",
      district: u.facility?.district || "N/A",
      upazila: u.facility?.upazila || "N/A",
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
      facilityName, facilityCode, facilityType, division, district, upazila 
    } = await req.json();

    if (!email || !role || !facilityName || !division || !district) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    let facilityId;
    if (facilityCode) {
      // Find or create facility by code
      const fac = await prisma.facility.upsert({
        where: { facilityCode },
        update: {
          facilityName,
          facilityType,
          division,
          district,
          upazila
        },
        create: {
          facilityCode,
          facilityName,
          facilityType,
          division,
          district,
          upazila
        }
      });
      facilityId = fac.id;
    } else {
      // Create facility without code (though code is unique, maybe generate one)
      const fac = await prisma.facility.create({
        data: {
          facilityCode: `FAC-${Date.now()}`,
          facilityName,
          facilityType,
          division,
          district,
          upazila
        }
      });
      facilityId = fac.id;
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    const nameToUse = name || email.split('@')[0];

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: nameToUse,
        nameNormalized: nameToUse.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        facilityId,
        role,
        isActive: true,
      },
    });

    if (email && password) {
      await sendUserCreatedEmail(email, password, facilityName, role);
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
      id, role, emailVerified, password, isActive, name, email,
      facilityName, facilityCode, facilityType, division, district, upazila 
    } = await req.json();
    
    const userToUpdate = await prisma.user.findUnique({
      where: { id },
      include: { facility: true }
    });

    if (!userToUpdate) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (role) updateData.role = role;
    if (emailVerified !== undefined) updateData.emailVerified = emailVerified ? new Date() : null;
    if (password) updateData.password = await bcrypt.hash(password, 10);
    if (isActive !== undefined) updateData.isActive = isActive;
    if (name) {
      updateData.name = name;
      updateData.nameNormalized = name.toLowerCase().replace(/[^a-z0-9]/g, "_");
    }
    if (email) {
      updateData.email = email;
      if (!name) {
        updateData.nameNormalized = email.toLowerCase().replace(/[^a-z0-9]/g, "_");
      }
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { facility: true },
    });

    // Update facility if exists and data provided
    if (user.facilityId && facilityName) {
      await prisma.facility.update({
        where: { id: user.facilityId },
        data: {
          facilityName,
          facilityCode: facilityCode || user.facility?.facilityCode || `FAC-${Date.now()}`,
          facilityType,
          division,
          district,
          upazila
        }
      });
    }

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

    await prisma.user.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}