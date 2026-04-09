import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const division = searchParams.get("division");
  const district = searchParams.get("district");

  if (!division || !district) {
    return NextResponse.json({ error: "Division and district required" }, { status: 400 });
  }

  try {
    const facilities = await prisma.facility.findMany({
      where: {
        division,
        district,
        isActive: true,
      },
      orderBy: { facilityName: 'asc' },
      select: {
        id: true,
        facilityName: true,
        facilityCode: true,
        facilityType: true,
        upazila: true,
      },
    });

    return NextResponse.json(facilities);
  } catch (error) {
    console.error("Facilities error:", error);
    return NextResponse.json({ error: "Failed to fetch facilities" }, { status: 500 });
  }
}