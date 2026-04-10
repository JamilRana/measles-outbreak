import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BD_DISTRICT_COORDS } from "@/lib/bd-districts";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const outbreakId = searchParams.get("outbreakId");
    const personDivision = searchParams.get("division");
    const personDistrict = searchParams.get("district");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: any = {};
    if (outbreakId) where.outbreakId = outbreakId;
    if (personDivision) where.facility = { ...where.facility, division: personDivision };
    if (personDistrict) where.facility = { ...where.facility, district: personDistrict };

    if (date) {
      const d = new Date(date);
      where.reportingDate = {
        gte: new Date(d.setHours(0, 0, 0, 0)),
        lte: new Date(d.setHours(23, 59, 59, 999)),
      };
    } else if (from && to) {
      where.reportingDate = {
        gte: new Date(from),
        lte: new Date(new Date(to).setHours(23, 59, 59, 999)),
      };
    }

    const reports = await prisma.dailyReport.findMany({
      where,
      include: {
        facility: {
          select: {
            district: true,
            division: true,
          }
        },
        fieldValues: {
          include: { formField: true }
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
      const district = r.facility.district || 'Unknown';
      const division = r.facility.division || 'Unknown';
      
      if (!byDistrict[district]) {
        byDistrict[district] = {
          district,
          division,
          confirmed: 0,
          deaths: 0,
          hospitalized: 0,
        };
      }

      // Map dynamic fields
      const dynamicConfirmed = r.fieldValues.find(f => f.formField.fieldKey === 'confirmed24h')?.value;
      const dynamicSDeath = r.fieldValues.find(f => f.formField.fieldKey === 'suspectedDeath24h')?.value;
      const dynamicCDeath = r.fieldValues.find(f => f.formField.fieldKey === 'confirmedDeath24h')?.value;
      const dynamicAdmitted = r.fieldValues.find(f => f.formField.fieldKey === 'admitted24h')?.value;

      byDistrict[district].confirmed += dynamicConfirmed ? Number(dynamicConfirmed) : r.confirmed24h;
      
      const deaths = (dynamicSDeath ? Number(dynamicSDeath) : r.suspectedDeath24h) + 
                     (dynamicCDeath ? Number(dynamicCDeath) : r.confirmedDeath24h);
      byDistrict[district].deaths += deaths;
      
      byDistrict[district].hospitalized += dynamicAdmitted ? Number(dynamicAdmitted) : r.admitted24h;
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