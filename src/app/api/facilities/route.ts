import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const division = searchParams.get("division");
  const district = searchParams.get("district");

  try {
    const where: any = { isActive: true };
    if (division) where.division = division;
    if (district) where.district = district;

    const facilities = await prisma.facility.findMany({
      where,
      orderBy: { facilityName: 'asc' },
      select: {
        id: true,
        facilityName: true,
        facilityCode: true,
        facilityType: true,
        division: true,
        district: true,
        upazila: true,
        email: true,
        phone: true,
        users: {
          where: { role: "USER", isActive: true },
          select: { email: true }
        }
      },
    });

    const mapped = facilities.map((f: any) => {
      const { users, ...rest } = f;
      return {
        ...rest,
        email: f.email || users[0]?.email || null
      };
    });

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Facilities error:", error);
    return NextResponse.json({ error: "Failed to fetch facilities" }, { status: 500 });
  }
}