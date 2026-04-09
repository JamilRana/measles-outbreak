import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BD_DISTRICT_COORDS } from "@/lib/bd-districts";

export async function GET() {
  try {
    const reports = await prisma.dailyReport.findMany({
      include: {
        user: {
          select: {
            district: true,
            division: true,
          }
        }
      },
    });

    const byDistrict: Record<string, {
      district: string;
      division: string;
      confirmed: number;
      deaths: number;
      hospitalized: number;
    }> = {};

    reports.forEach((r) => {
      const district = r.user.district || 'Unknown';
      const division = r.user.division || 'Unknown';
      
      if (!byDistrict[district]) {
        byDistrict[district] = {
          district,
          division,
          confirmed: 0,
          deaths: 0,
          hospitalized: 0,
        };
      }
      byDistrict[district].confirmed += r.confirmed24h;
      byDistrict[district].deaths += r.suspectedDeath24h + r.confirmedDeath24h;
      byDistrict[district].hospitalized += r.admitted24h;
    });

    const geoData = Object.values(byDistrict)
      .filter((d) => BD_DISTRICT_COORDS[d.district])
      .map((d) => ({
        ...d,
        lat: BD_DISTRICT_COORDS[d.district].lat,
        lng: BD_DISTRICT_COORDS[d.district].lng,
      }));

    return NextResponse.json(geoData);
  } catch (error) {
    console.error("Geo data error:", error);
    return NextResponse.json({ error: "Failed to fetch geo data" }, { status: 500 });
  }
}