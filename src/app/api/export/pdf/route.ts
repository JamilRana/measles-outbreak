import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { generateGovtPDFBuffer } from "@/lib/pdf-report-generator";
import { getBdDateString } from "@/lib/timezone";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { outbreakId, date, division, district } = body;

    const filterDate = date || getBdDateString();

    const validDate = (d: any) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
    const safeDate = validDate(date);

    // 1. Fetch Today/Filtered Summary
    const baseFilter: any = {
      outbreakId,
      status: "PUBLISHED",
    };

    if (safeDate) {
      baseFilter.periodStart = new Date(safeDate);
    }
    if (division) baseFilter.division = division;
    if (district) baseFilter.district = district;

    // Use parameterized queryRaw for high-performance aggregation
    const summaryDataPromise = prisma.$queryRaw`
      SELECT 
        COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'suspected24h', '')::numeric, 0)), 0)::int as "suspected24h",
        COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'confirmed24h', '')::numeric, 0)), 0)::int as "confirmed24h",
        COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'admitted24h', '')::numeric, 0)), 0)::int as "admitted24h",
        COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'suspectedDeath24h', '')::numeric, 0)), 0)::int as "suspectedDeath24h",
        COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'confirmedDeath24h', '')::numeric, 0)), 0)::int as "confirmedDeath24h"
      FROM "Report" r
      JOIN "Facility" f ON f.id = r."facilityId"
      WHERE r."outbreakId" = ${outbreakId}
      AND r."status" = 'PUBLISHED'
      ${safeDate ? Prisma.sql`AND r."periodStart"::date = ${safeDate}::date` : Prisma.empty}
      ${division ? Prisma.sql`AND f.division = ${division}` : Prisma.empty}
      ${district ? Prisma.sql`AND f.district = ${district}` : Prisma.empty}
    `;

    // Fetch breakdown
    const breakdownPromise = prisma.$queryRaw`
      SELECT 
        COALESCE(f."division", 'Unknown') as name,
        COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'suspected24h', '')::numeric, 0)), 0)::int as "suspected24h",
        COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'confirmed24h', '')::numeric, 0)), 0)::int as "confirmed24h",
        COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'suspectedDeath24h', '')::numeric, 0)), 0)::int as "suspectedDeath24h",
        COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'confirmedDeath24h', '')::numeric, 0)), 0)::int as "confirmedDeath24h"
      FROM "Report" r
      JOIN "Facility" f ON f.id = r."facilityId"
      WHERE r."outbreakId" = ${outbreakId}
      AND r."status" = 'PUBLISHED'
      ${safeDate ? Prisma.sql`AND r."periodStart"::date = ${safeDate}::date` : Prisma.empty}
      ${division ? Prisma.sql`AND f.division = ${division}` : Prisma.empty}
      ${district ? Prisma.sql`AND f.district = ${district}` : Prisma.empty}
      GROUP BY f."division"
    `;

    // 2. Fetch Cumulative
    const cumulativePromise = prisma.$queryRaw`
      SELECT 
        COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'suspected24h', '')::numeric, 0)), 0)::int as "suspected24h",
        COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'confirmed24h', '')::numeric, 0)), 0)::int as "confirmed24h",
        COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'suspectedDeath24h', '')::numeric, 0)), 0)::int as "suspectedDeath24h",
        COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'confirmedDeath24h', '')::numeric, 0)), 0)::int as "confirmedDeath24h"
      FROM "Report" r
      JOIN "Facility" f ON f.id = r."facilityId"
      WHERE r."outbreakId" = ${outbreakId}
      AND r."status" = 'PUBLISHED'
      ${safeDate ? Prisma.sql`AND r."periodStart"::date <= ${safeDate}::date` : Prisma.empty}
      ${division ? Prisma.sql`AND f.division = ${division}` : Prisma.empty}
      ${district ? Prisma.sql`AND f.district = ${district}` : Prisma.empty}
    `;

    const cumulativeBreakdownPromise = prisma.$queryRaw`
      SELECT 
        COALESCE(f."division", 'Unknown') as name,
        COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'suspected24h', '')::numeric, 0)), 0)::int as "suspected24h",
        COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'suspectedDeath24h', '')::numeric, 0)), 0)::int as "suspectedDeath24h",
        COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'confirmedDeath24h', '')::numeric, 0)), 0)::int as "confirmedDeath24h"
      FROM "Report" r
      JOIN "Facility" f ON f.id = r."facilityId"
      WHERE r."outbreakId" = ${outbreakId}
      AND r."status" = 'PUBLISHED'
      ${safeDate ? Prisma.sql`AND r."periodStart"::date <= ${safeDate}::date` : Prisma.empty}
      ${division ? Prisma.sql`AND f.division = ${division}` : Prisma.empty}
      ${district ? Prisma.sql`AND f.district = ${district}` : Prisma.empty}
      GROUP BY f."division"
    `;

    const [sumArr, brkArr, cumArr, cumBrkArr] = await Promise.all([
      summaryDataPromise,
      breakdownPromise,
      cumulativePromise,
      cumulativeBreakdownPromise
    ]) as any[];

    const summary = {
      totals: sumArr[0],
      breakdown: brkArr.reduce((acc: any, curr: any) => {
        acc[curr.name] = curr;
        return acc;
      }, {})
    };

    const cumulative = {
      totals: cumArr[0],
      breakdown: cumBrkArr.reduce((acc: any, curr: any) => {
        acc[curr.name] = curr;
        return acc;
      }, {})
    };

    // 3. Generate PDF
    const pdfBuffer = await generateGovtPDFBuffer(summary, cumulative, filterDate);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="SITREP_${filterDate}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("PDF Export Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
