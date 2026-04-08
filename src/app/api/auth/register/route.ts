import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizeFacilityName } from "@/lib/utils";
import { sendVerificationEmail } from "@/lib/mail";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { facilityName, email, phone, password, division, district } = await req.json();

    if (!facilityName || !email || !password || !division || !district) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const normalized = normalizeFacilityName(facilityName);

    // Check if facility already exists
    const existingFacility = await prisma.user.findUnique({
      where: { nameNormalized: normalized },
    });

    if (existingFacility) {
      return NextResponse.json({ error: "A facility with this name already exists" }, { status: 400 });
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        facilityName,
        nameNormalized: normalized,
        email,
        phone,
        password: hashedPassword,
        division,
        district,
      },
    });

    // Create verification token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.verificationToken.create({
      data: {
        email: user.email,
        token,
        expires,
        type: "EMAIL_VERIFICATION",
      },
    });

    await sendVerificationEmail(user.email, token);

    return NextResponse.json({ message: "Registration successful. Please check your email for verification link." }, { status: 201 });
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
