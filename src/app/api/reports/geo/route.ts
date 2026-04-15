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

    // 1. Construct Modern Where
    const whereModern: any = { status: "PUBLISHED" };
    if (outbreakId) whereModern.outbreakId = outbreakId;
    if (personDivision || personDistrict) {
      whereModern.facility = {
        ...(personDivision && { division: personDivision }),
        ...(personDistrict && { district: personDistrict }),
      };
    }
    if (date) {
      const d = new Date(date);
      whereModern.periodStart = {
        gte: new Date(d.setHours(0, 0, 0, 0)),
        lte: new Date(d.setHours(23, 59, 59, 999)),
      };
    } else if (from && to) {
      whereModern.periodStart = {
        gte: new Date(from),
        lte: new Date(new Date(to).setHours(23, 59, 59, 999)),
      };
    }

    // 2. Construct Legacy Where
    const whereLegacy: any = { published: true };
    if (outbreakId) whereLegacy.outbreakId = outbreakId;
    if (personDivision || personDistrict) {
      whereLegacy.facility = {
        ...(personDivision && { division: personDivision }),
        ...(personDistrict && { district: personDistrict }),
      };
    }
    if (date) {
      const d = new Date(date);
      whereLegacy.reportingDate = {
        gte: new Date(d.setHours(0, 0, 0, 0)),
        lte: new Date(d.setHours(23, 59, 59, 999)),
      };
    } else if (from && to) {
      whereLegacy.reportingDate = {
        gte: new Date(from),
        lte: new Date(new Date(to).setHours(23, 59, 59, 999)),
      };
    }

    const [modernReports, legacyReports] = await Promise.all([
      prisma.report.findMany({
        where: whereModern,
        include: { facility: { select: { district: true, division: true } } }
      }),
      prisma.dailyReport.findMany({
        where: whereLegacy,
        include: { facility: { select: { district: true, division: true } } }
      })
    ]);

    const byDistrict: Record<string, {
      district: string;
      division: string;
      confirmed: number;
      deaths: number;
      hospitalized: number;
    }> = {};

    const processReport = (r: any, isModern: boolean) => {
      const district = r.facility.district || 'Unknown';
      const division = r.facility.division || 'Unknown';
      
      if (!byDistrict[district]) {
        byDistrict[district] = { district, division, confirmed: 0, deaths: 0, hospitalized: 0 };
      }

      if (isModern) {
        const snap = r.dataSnapshot as any;
        byDistrict[district].confirmed += (Number(snap.confirmed24h) || 0);
        byDistrict[district].deaths += (Number(snap.suspectedDeath24h) || 0) + (Number(snap.confirmedDeath24h) || 0);
        byDistrict[district].hospitalized += (Number(snap.admitted24h) || 0);
      } else {
        byDistrict[district].confirmed += r.confirmed24h;
        byDistrict[district].deaths += r.suspectedDeath24h + r.confirmedDeath24h;
        byDistrict[district].hospitalized += r.admitted24h;
      }
    };

    modernReports.forEach(r => processReport(r, true));
    legacyReports.forEach(r => processReport(r, false));

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