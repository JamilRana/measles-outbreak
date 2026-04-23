import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateGovtPDFBuffer } from "@/lib/pdf-report-generator";
import { getBdDateString } from "@/lib/timezone";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { outbreakId, date, division, district } = body;

    const filterDate = date || getBdDateString();

    // 1. Fetch Today/Filtered Summary
    const baseFilter: any = {
      outbreakId,
      status: "PUBLISHED",
    };

    if (date) {
      baseFilter.periodStart = new Date(date);
    }
    if (division) baseFilter.division = division;
    if (district) baseFilter.district = district;

    // Use queryRaw for high-performance aggregation (same as Task 2)
    const summaryDataPromise = prisma.$queryRaw`
      SELECT 
        COALESCE(SUM(CAST(data_snapshot->>'suspected24h' AS INTEGER)), 0) as "suspected24h",
        COALESCE(SUM(CAST(data_snapshot->>'confirmed24h' AS INTEGER)), 0) as "confirmed24h",
        COALESCE(SUM(CAST(data_snapshot->>'admitted24h' AS INTEGER)), 0) as "admitted24h",
        COALESCE(SUM(CAST(data_snapshot->>'suspectedDeath24h' AS INTEGER)), 0) as "suspectedDeath24h",
        COALESCE(SUM(CAST(data_snapshot->>'confirmedDeath24h' AS INTEGER)), 0) as "confirmedDeath24h"
      FROM "Report"
      WHERE "outbreakId" = ${outbreakId}
      AND "status" = 'PUBLISHED'
      ${date ? prisma.$queryRaw`AND "periodStart" = ${new Date(date)}` : prisma.$queryRaw``}
    `;

    // Fetch breakdown
    const breakdownPromise = prisma.$queryRaw`
      SELECT 
        COALESCE("division", 'Unknown') as name,
        COALESCE(SUM(CAST(data_snapshot->>'suspected24h' AS INTEGER)), 0) as "suspected24h",
        COALESCE(SUM(CAST(data_snapshot->>'confirmed24h' AS INTEGER)), 0) as "confirmed24h",
        COALESCE(SUM(CAST(data_snapshot->>'suspectedDeath24h' AS INTEGER)), 0) as "suspectedDeath24h",
        COALESCE(SUM(CAST(data_snapshot->>'confirmedDeath24h' AS INTEGER)), 0) as "confirmedDeath24h"
      FROM "Report"
      WHERE "outbreakId" = ${outbreakId}
      AND "status" = 'PUBLISHED'
      ${date ? prisma.$queryRaw`AND "periodStart" = ${new Date(date)}` : prisma.$queryRaw``}
      GROUP BY "division"
    `;

    // 2. Fetch Cumulative
    const cumulativePromise = prisma.$queryRaw`
      SELECT 
        COALESCE(SUM(CAST(data_snapshot->>'suspected24h' AS INTEGER)), 0) as "suspected24h",
        COALESCE(SUM(CAST(data_snapshot->>'confirmed24h' AS INTEGER)), 0) as "confirmed24h",
        COALESCE(SUM(CAST(data_snapshot->>'suspectedDeath24h' AS INTEGER)), 0) as "suspectedDeath24h",
        COALESCE(SUM(CAST(data_snapshot->>'confirmedDeath24h' AS INTEGER)), 0) as "confirmedDeath24h"
      FROM "Report"
      WHERE "outbreakId" = ${outbreakId}
      AND "status" = 'PUBLISHED'
    `;

    const cumulativeBreakdownPromise = prisma.$queryRaw`
      SELECT 
        COALESCE("division", 'Unknown') as name,
        COALESCE(SUM(CAST(data_snapshot->>'suspected24h' AS INTEGER)), 0) as "suspected24h",
        COALESCE(SUM(CAST(data_snapshot->>'suspectedDeath24h' AS INTEGER)), 0) as "suspectedDeath24h",
        COALESCE(SUM(CAST(data_snapshot->>'confirmedDeath24h' AS INTEGER)), 0) as "confirmedDeath24h"
      FROM "Report"
      WHERE "outbreakId" = ${outbreakId}
      AND "status" = 'PUBLISHED'
      GROUP BY "division"
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
