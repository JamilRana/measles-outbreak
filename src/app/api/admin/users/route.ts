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
        facility: {
          select: {
            facilityName: true,
            facilityCode: true,
            facilityType: true,
            division: true,
            district: true,
            upazila: true,
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
      facility: u.facility,
    })));
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { email, password, facilityId, name, role } = await req.json();

    if (!email || !facilityId || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
        nameNormalized: (name || email).toLowerCase().replace(/[^a-z0-9]/g, "_"),
        facilityId,
        role,
        emailVerified: new Date(),
        isActive: true,
      },
    });

    if (email && password) {
      await sendUserCreatedEmail(email, password, name || facilityId, role);
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
    const { id, role, emailVerified, password, isActive } = await req.json();
    
    const updateData: any = {};
    if (role) updateData.role = role;
    if (emailVerified !== undefined) updateData.emailVerified = emailVerified ? new Date() : null;
    if (password) updateData.password = await bcrypt.hash(password, 10);
    if (isActive !== undefined) updateData.isActive = isActive;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { facility: true },
    });

    if (isActive !== undefined && user.facility) {
      await sendAccountStatusEmail(user.email, user.facility.facilityName, isActive);
    }
    
    return NextResponse.json({ id: user.id, email: user.email, role: user.role, isActive: user.isActive });
  } catch (error) {
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