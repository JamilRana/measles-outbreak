import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { rebuildSnapshot } from "@/lib/snapshot";
import { ReportStatus } from "@prisma/client";

/**
 * GET /api/reports
 * 
 * Supports:
 * - Pagination (page, limit)
 * - Filtering (outbreakId, facilityId, division, district)
 * - Date Range (from, to) or specific date (date)
 * - Summary mode (summary=true)
 * 
 * Aggregates data from both modern 'Report' table and legacy 'DailyReport' table.
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    
    // Filtering parameters
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;
    
    const outbreakId = searchParams.get("outbreakId");
    const facilityId = searchParams.get("facilityId");
    const divisions = searchParams.get("divisions")?.split(',').filter(Boolean);
    const districts = searchParams.get("districts")?.split(',').filter(Boolean);
    const summary = searchParams.get("summary") === "true";
    
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    let specificDate = searchParams.get("date");

    // --- TEMPORAL VISIBILITY LOGIC ---
    // This ensures dashboard/bulletin don't show today's data until publish time
    const { getBdTime, getBdDateString } = require("@/lib/timezone");
    const bdNow = getBdTime();
    const todayStr = getBdDateString(bdNow);

    let enforcePublishTime = false;
    let effectiveOutbreakId = outbreakId;
    let outbreak: any = null;

    // Get default outbreak if none provided
    if (!effectiveOutbreakId) {
      const settings = await prisma.settings.findFirst();
      if (settings?.defaultOutbreakId) {
        effectiveOutbreakId = settings.defaultOutbreakId;
      }
    }

    if (effectiveOutbreakId) {
      // 1. Auto-publish triggered on data fetch
      const { autoPublishReports } = require("@/lib/publish-manager");
      await autoPublishReports(effectiveOutbreakId);

      // 2. Check if we should restrict "Today's" data
      outbreak = await prisma.outbreak.findUnique({
        where: { id: effectiveOutbreakId },
        select: { publishTimeHour: true, publishTimeMinute: true }
      });

      if (outbreak) {
        const publishTime = new Date(bdNow);
        publishTime.setHours(outbreak.publishTimeHour, outbreak.publishTimeMinute, 0, 0);
        
        // Skip enforcement for admins/editors
        const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "EDITOR";
        enforcePublishTime = (bdNow < publishTime) && !isAdmin;

        // Handle specific date query
        if (specificDate === todayStr && enforcePublishTime) {
          const yesterday = new Date(bdNow);
          yesterday.setDate(yesterday.getDate() - 1);
          specificDate = getBdDateString(yesterday);
        }

        // Handle range query - adjust 'to' date if it includes today (done later in where clause)
      }
    }

    // Construct "where" for modern table
    const where: any = {};
    if (outbreakId) where.outbreakId = outbreakId;
    if (facilityId) where.facilityId = facilityId;
    
    if ((divisions && divisions.length > 0) || (districts && districts.length > 0)) {
      where.facility = {
        ...(divisions && divisions.length > 0 && { division: { in: divisions } }),
        ...(districts && districts.length > 0 && { district: { in: districts } }),
      };
    }
    
    // Build adjusted date range for temporal filtering (before constructing where clauses)
    let adjustedFrom = from;
    let adjustedTo = to;
    if (enforcePublishTime && to === todayStr) {
      const yesterday = new Date(bdNow);
      yesterday.setDate(yesterday.getDate() - 1);
      adjustedTo = getBdDateString(yesterday);
    }
    
    if (specificDate) {
      where.periodStart = {
        gte: new Date(specificDate),
        lt: new Date(new Date(specificDate).getTime() + 24 * 60 * 60 * 1000)
      };
    } else if (from && to) {
      where.periodStart = { gte: new Date(from), lte: new Date(adjustedTo || to) };
    }

    if (summary) {
      // 1. Fetch Modern Snapshots
      const modernReports = await prisma.report.findMany({
        where: { ...where, status: ReportStatus.PUBLISHED },
        select: { dataSnapshot: true }
      });

      // 2. Fetch Legacy DailyReports
      const legacyReports = await prisma.dailyReport.findMany({
        where: {
          ...(outbreakId && { outbreakId }),
          ...(facilityId && { facilityId }),
          ...((divisions && divisions.length > 0) || (districts && districts.length > 0) ? { 
            facility: {
              ...(divisions && divisions.length > 0 && { division: { in: divisions } }),
              ...(districts && districts.length > 0 && { district: { in: districts } }),
            }
          } : {}),
          ...(specificDate ? {
             reportingDate: {
               gte: new Date(specificDate),
               lt: new Date(new Date(specificDate).getTime() + 24 * 60 * 60 * 1000)
             }
          } : adjustedFrom && adjustedTo ? {
             reportingDate: { gte: new Date(adjustedFrom), lte: new Date(adjustedTo) }
          } : {})
        }
      });

      // 3. Dynamic Aggregation
      const totals: Record<string, number> = {};
      
      // Process modern snapshots
      modernReports.forEach(r => {
        const snap = r.dataSnapshot as any;
        if (!snap) return;
        Object.entries(snap).forEach(([k, v]) => {
          if (typeof v === 'number') totals[k] = (totals[k] || 0) + v;
          else if (typeof v === 'string' && !isNaN(Number(v))) totals[k] = (totals[k] || 0) + Number(v);
        });
      });

      // Process legacy fields (mapping to standard keys)
      legacyReports.forEach(r => {
        const keys = [
          'suspected24h', 'confirmed24h', 'suspectedDeath24h', 
          'confirmedDeath24h', 'admitted24h', 'discharged24h', 'serumSent24h'
        ];
        keys.forEach(k => {
          const val = (r as any)[k];
          if (typeof val === 'number') totals[k] = (totals[k] || 0) + val;
        });
      });

      return NextResponse.json({ totals });
    }

    // Construct "where" for legacy table
    const legacyWhere: any = {
      ...(outbreakId && { outbreakId }),
      ...(facilityId && { facilityId }),
      ...((divisions && divisions.length > 0) || (districts && districts.length > 0) ? { 
        facility: {
          ...(divisions && divisions.length > 0 && { division: { in: divisions } }),
          ...(districts && districts.length > 0 && { district: { in: districts } }),
        }
      } : {}),
      ...(specificDate ? {
         reportingDate: {
           gte: new Date(specificDate),
           lt: new Date(new Date(specificDate).getTime() + 24 * 60 * 60 * 1000)
         }
      } : from && to ? {
         reportingDate: { gte: new Date(from), lte: new Date(adjustedTo || to) }
      } : {})
    };

    // LIST VIEW: Combined Fetch
    const [modernReports, legacyReports, modernCount, legacyCount] = await Promise.all([
      prisma.report.findMany({
        where,
        include: { 
          facility: { select: { facilityName: true, division: true, district: true } },
          outbreak: { select: { name: true } },
          fieldValues: true
        },
        orderBy: { periodStart: "desc" },
        take: limit,
        skip: skip
      }),
      prisma.dailyReport.findMany({
        where: legacyWhere,
        include: { 
          facility: { select: { facilityName: true, division: true, district: true } },
          outbreak: { select: { name: true } }
        },
        orderBy: { reportingDate: "desc" },
        take: limit,
        skip: skip
      }),
      prisma.report.count({ where }),
      prisma.dailyReport.count({ where: legacyWhere })
    ]);

    // Map modern to common structure (flattening snapshot)
    const mappedModern = modernReports.map(r => ({
      ...r,
      reportingDate: r.periodStart,
      published: r.status === ReportStatus.PUBLISHED,
      ...(r.dataSnapshot as any) 
    }));

    const mappedLegacy = legacyReports.map(r => ({
       ...r,
       isModern: false
    }));

    // Simple interleaving or priority sort
    const combined = [...mappedModern, ...mappedLegacy].sort((a, b) => 
      new Date(b.reportingDate).getTime() - new Date(a.reportingDate).getTime()
    );

    const totalCount = modernCount + legacyCount;

    // Build temporal metadata
    let dataDate = to || specificDate || todayStr;
    if (adjustedTo && to === todayStr) {
      dataDate = adjustedTo;
    }

    return NextResponse.json({
      reports: combined.slice(0, limit),
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      },
      temporal: {
        dataDate,
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

    // Verify facility exists to prevent P2003
    const facility = await prisma.facility.findUnique({ where: { id: facilityId } });
    if (!facility) {
      return NextResponse.json({ error: "Invalid facility selected" }, { status: 400 });
    }

    // Check for existing
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

    // Identify core fields for this outbreak
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
          status: ReportStatus.SUBMITTED,
        }
      });

      // Optimized: Collect and batch create
      const fieldValuesData = [];
      for (const field of outbreakFields) {
        let val = data[field.fieldKey];
        if (val !== undefined) {
          fieldValuesData.push({
            modernReportId: newReport.id,
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
      timeout: 15000 // Increase timeout to 15s
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("Manual Report Creation Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}