import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Facility code required" }, { status: 400 });
  }

  try {
    const facility = await prisma.facility.findUnique({
      where: { facilityCode: code.toUpperCase() },
      select: {
        id: true,
        facilityName: true,
        facilityCode: true,
        facilityType: true,
        division: true,
        district: true,
        upazila: true,
        isActive: true,
      },
    });

    if (!facility) {
      return NextResponse.json({ error: "Invalid facility code" }, { status: 404 });
    }

    if (!facility.isActive) {
      return NextResponse.json({ error: "This facility is inactive" }, { status: 400 });
    }

    return NextResponse.json(facility);
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json({ error: "Failed to verify facility" }, { status: 500 });
  }
}