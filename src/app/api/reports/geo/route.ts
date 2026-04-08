import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BD_DISTRICT_COORDS } from "@/lib/bd-districts";

export async function GET() {
  try {
    const reports = await prisma.report.findMany({
      select: {
        district: true,
        division: true,
        confirmed24h: true,
        suspectedDeath24h: true,
        confirmedDeath24h: true,
        admitted24h: true,
      },
    });

    // Aggregate by district
    const byDistrict: Record<string, {
      district: string;
      division: string;
      confirmed: number;
      deaths: number;
      hospitalized: number;
    }> = {};

    reports.forEach((r) => {
      if (!byDistrict[r.district]) {
        byDistrict[r.district] = {
          district: r.district,
          division: r.division,
          confirmed: 0,
          deaths: 0,
          hospitalized: 0,
        };
      }
      byDistrict[r.district].confirmed += r.confirmed24h;
      byDistrict[r.district].deaths += r.suspectedDeath24h + r.confirmedDeath24h;
      byDistrict[r.district].hospitalized += r.admitted24h;
    });

    // Attach coordinates
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
