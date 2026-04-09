import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email, password, facilityName, phone, division, district, name } = await req.json();

    if (!email || !password || !facilityName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });

    if (existingEmail) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let facility = await prisma.facility.findUnique({
      where: { facilityCode: facilityName.toUpperCase().replace(/[^A-Z0-9]/g, "_").substring(0, 10) }
    });

    if (!facility) {
      facility = await prisma.facility.create({
        data: {
          facilityCode: facilityName.toUpperCase().replace(/[^A-Z0-9]/g, "_").substring(0, 10),
          facilityName,
          division: division || "Unknown",
          district: district || "Unknown",
        }
      });
    }

    const normalized = (name || facilityName).toLowerCase().replace(/[^a-z0-9]/g, "_");

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || facilityName,
        nameNormalized: normalized,
        facilityId: facility.id,
        phone,
        role: "USER",
      },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.verificationToken.create({
      data: {
        email: user.email,
        token,
        expires,
        type: "EMAIL_VERIFICATION",
      },
    });

    return NextResponse.json({ message: "Registration successful. Please verify your email." });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}