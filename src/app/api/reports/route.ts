import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rebuildSnapshot } from "@/lib/snapshot";
import { ReportStatus } from "@prisma/client";
import { autoPublishReports } from "@/lib/publish-manager";

/**
 * GET /api/reports
 * 
 * Supports:
 * - Pagination (page, limit)
 * - Filtering (outbreakId, facilityId, division, district)
 * - Date Range (from, to) or specific date (date)
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    
    // Filtering parameters
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");
    
    const outbreakId = searchParams.get("outbreakId") || 'measles-2026';
    const facilityId = searchParams.get("facilityId");
    const divisions = searchParams.get("divisions")?.split(',').filter(Boolean);
    const districts = searchParams.get("districts")?.split(',').filter(Boolean);
    const q = searchParams.get("q");
    
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    let specificDate = searchParams.get("date");

    // --- TEMPORAL VISIBILITY LOGIC ---
    const { getBdTime, getBdDateString } = require("@/lib/timezone");
    const bdNow = getBdTime();
    const todayStr = getBdDateString(bdNow);

    let enforcePublishTime = false;
    let effectiveOutbreakId = outbreakId;
    let outbreak: any = null;

    const settings = await prisma.settings.findFirst();
    if (!effectiveOutbreakId && settings?.defaultOutbreakId) {
      effectiveOutbreakId = settings.defaultOutbreakId;
    }

    if (effectiveOutbreakId) {
      // Auto-publish reports if we are past the publish time
      await autoPublishReports(effectiveOutbreakId);

      outbreak = await prisma.outbreak.findUnique({
        where: { id: effectiveOutbreakId },
        select: { publishTimeHour: true, publishTimeMinute: true }
      });

      if (outbreak) {
        const publishTime = new Date(bdNow);
        publishTime.setHours(outbreak.publishTimeHour || 0, outbreak.publishTimeMinute || 0, 0, 0);
        const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "EDITOR";
        enforcePublishTime = (bdNow < publishTime) && !isAdmin;

        if (specificDate === todayStr && enforcePublishTime) {
          const yesterday = new Date(bdNow);
          yesterday.setDate(yesterday.getDate() - 1);
          specificDate = getBdDateString(yesterday);
        }
      }
    }

    // --- SHARED GEO FILTER ---
    const geoFilter: any = {};
    if (divisions && divisions.length > 0) geoFilter.division = { in: divisions };
    if (districts && districts.length > 0) geoFilter.district = { in: districts };
    if (q) {
      geoFilter.OR = [
        { facilityName: { contains: q, mode: 'insensitive' } },
        { facilityCode: { contains: q, mode: 'insensitive' } },
      ];
    }

    const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "EDITOR";
    const where: any = { outbreakId: effectiveOutbreakId };
    if (!isAdmin) {
      where.status = ReportStatus.PUBLISHED;
    }
    
    if (facilityId) where.facilityId = facilityId;
    if (Object.keys(geoFilter).length > 0) where.facility = geoFilter;
    
    const adjustedTo = enforcePublishTime && to === todayStr ? getBdDateString(new Date(bdNow.getTime() - 86400000)) : to;
    
    if (specificDate) {
      const d = new Date(specificDate);
      const nextD = new Date(d.getTime() + 86400000);
      where.periodStart = { gte: d, lt: nextD };
    } else if (from || adjustedTo) {
      where.periodStart = {};
      if (from) { where.periodStart.gte = new Date(from); }
      if (adjustedTo) { 
        const end = new Date(new Date(adjustedTo).getTime() + 86400000 - 1);
        where.periodStart.lte = end; 
      }
    }

    const [reports, totalCount] = await Promise.all([
      prisma.report.findMany({
        where,
        include: { facility: true, user: { select: { name: true } } },
        orderBy: { periodStart: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.report.count({ where })
    ]);

    // Format for frontend (preserving keys)
    const formatted = reports.map(r => ({
      ...r,
      reportingDate: r.periodStart,
      published: r.status === ReportStatus.PUBLISHED,
      ...(r.dataSnapshot as any)
    }));

    return NextResponse.json({
      reports: formatted,
      pagination: { total: totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) },
      temporal: {
        dataDate: adjustedTo || specificDate || todayStr,
        isHistorical: enforcePublishTime || (adjustedTo && adjustedTo !== to),
        publishTime: outbreak ? `${String(outbreak.publishTimeHour).padStart(2, '0')}:${String(outbreak.publishTimeMinute).padStart(2, '0')}` : null
      }
    });

  } catch (error) {
    console.error("Reports API Error:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "EDITOR")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const { reportingDate, facilityId, outbreakId, userId } = data;

    if (!reportingDate || !facilityId || !outbreakId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const facility = await prisma.facility.findUnique({ where: { id: facilityId } });
    if (!facility) {
      return NextResponse.json({ error: "Invalid facility selected" }, { status: 400 });
    }

    const existing = await prisma.report.findUnique({
      where: {
        facilityId_outbreakId_periodStart: {
          facilityId,
          outbreakId,
          periodStart: new Date(reportingDate)
        }
      }
    });

    if (existing) {
      return NextResponse.json({ error: "Report already exists for this date and facility" }, { status: 409 });
    }

    const outbreakFields = await prisma.formField.findMany({
      where: { outbreakId }
    });

    const report = await prisma.$transaction(async (tx) => {
      const newReport = await tx.report.create({
        data: {
          outbreakId,
          facilityId,
          userId: userId || session.user.id,
          periodStart: new Date(reportingDate),
          periodEnd: new Date(reportingDate),
          status: (session.user.role === 'ADMIN' || session.user.role === 'EDITOR') ? ReportStatus.PUBLISHED : ReportStatus.SUBMITTED,
        }
      });

      const fieldValuesData = [];
      for (const field of outbreakFields) {
        let val = data[field.fieldKey];
        if (val !== undefined) {
          fieldValuesData.push({
            reportId: newReport.id,
            formFieldId: field.id,
            value: String(val)
          });
        }
      }

      if (fieldValuesData.length > 0) {
        await tx.reportFieldValue.createMany({ data: fieldValuesData });
      }

      const snapshot = await rebuildSnapshot(newReport.id, tx);
      return await tx.report.update({
        where: { id: newReport.id },
        data: { dataSnapshot: snapshot as any }
      });
    }, {
      timeout: 15000
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("Manual Report Creation Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}