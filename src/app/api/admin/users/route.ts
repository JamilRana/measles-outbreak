import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { normalizeFacilityName } from "@/lib/utils";
import { sendUserCreatedEmail, sendAccountStatusEmail } from "@/lib/mail";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        facilityName: true,
        facilityCode: true,
        facilityType: true,
        division: true,
        district: true,
        upazila: true,
        role: true,
        emailVerified: true,
        isActive: true,
        createdAt: true,
        password: true,
      },
    });
    const usersWithoutPassword = users.map(({ password: _p, ...user }: any) => user);
    return NextResponse.json(usersWithoutPassword);
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
    const { email, password, facilityName, facilityCode, facilityType, division, district, upazila, role } = await req.json();

    if (!email || !facilityName || !role) {
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
        facilityName,
        nameNormalized: normalizeFacilityName(facilityName),
        facilityCode,
        facilityType,
        division,
        district,
        upazila,
        role,
        emailVerified: new Date(),
        isActive: true,
      },
    });

    if (email && password) {
      await sendUserCreatedEmail(email, password, facilityName, role);
    }

    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword, { status: 201 });
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
    const { id, role, emailVerified, password, isActive, ...otherData } = await req.json();
    
    const updateData: any = {};
    if (role) updateData.role = role;
    if (emailVerified !== undefined) updateData.emailVerified = emailVerified ? new Date() : null;
    if (password) updateData.password = await bcrypt.hash(password, 10);
    if (isActive !== undefined) updateData.isActive = isActive;
    if (Object.keys(otherData).length > 0) {
      Object.assign(updateData, otherData);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    if (isActive !== undefined) {
      await sendAccountStatusEmail(user.email, user.facilityName, isActive);
    }
    
    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword);
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
