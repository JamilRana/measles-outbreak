import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getBdTime, getBdDateString } from "@/lib/timezone";
import ExcelJS from "exceljs";

function escapeCsvField(val: any): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const format = (searchParams.get("format") || "xlsx").toLowerCase();
    const outbreakId = searchParams.get("outbreakId") || "measles-2026";
    const statusParam = (searchParams.get("status") || "PUBLISHED").toUpperCase();
    const requestedDivision = searchParams.get("division") || "";
    const requestedDistrict = searchParams.get("district") || "";
    const requestedFacilityId = searchParams.get("facilityId") || "";

    // Preset & Date Resolution
    const preset = (searchParams.get("preset") || "").toLowerCase();
    const monthParam = searchParams.get("month") || "";
    let startDateParam = searchParams.get("startDate") || "";
    let endDateParam = searchParams.get("endDate") || "";

    const bdNow = getBdTime();
    const todayStr = getBdDateString(bdNow);

    if (preset === "today") {
      startDateParam = todayStr;
      endDateParam = todayStr;
    } else if (preset === "yesterday") {
      const yesterday = new Date(bdNow.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayStr = getBdDateString(yesterday);
      startDateParam = yesterdayStr;
      endDateParam = yesterdayStr;
    } else if (preset === "last7") {
      const past7 = new Date(bdNow.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDateParam = getBdDateString(past7);
      endDateParam = todayStr;
    } else if (preset === "last30") {
      const past30 = new Date(bdNow.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDateParam = getBdDateString(past30);
      endDateParam = todayStr;
    } else if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [year, month] = monthParam.split("-").map(Number);
      startDateParam = `${monthParam}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      endDateParam = `${monthParam}-${String(lastDay).padStart(2, "0")}`;
    }

    const userRole = session.user.role || "USER";
    const isSuperAdmin = userRole === "ADMIN" || userRole === "EDITOR";
    const managedDivisions = session.user.managedDivisions || [];
    const managedDistricts = session.user.managedDistricts || [];
    const userFacilityId = session.user.facilityId;

    // RBAC Scoping Enforcement
    let enforcedDivision: string | undefined = requestedDivision || undefined;
    let enforcedDistrict: string | undefined = requestedDistrict || undefined;
    let enforcedFacilityId: string | undefined = requestedFacilityId || undefined;

    if (!isSuperAdmin) {
      if (userRole === "USER") {
        if (!userFacilityId) {
          return NextResponse.json({ error: "Forbidden: No assigned facility for user" }, { status: 403 });
        }
        enforcedFacilityId = userFacilityId;
      } else {
        if (managedDistricts.length > 0) {
          if (enforcedDistrict && !managedDistricts.includes(enforcedDistrict)) {
            return NextResponse.json({ error: "Forbidden: Unauthorized district scope" }, { status: 403 });
          }
          if (!enforcedDistrict && managedDistricts.length === 1) {
            enforcedDistrict = managedDistricts[0];
          }
        }
        if (managedDivisions.length > 0) {
          if (enforcedDivision && !managedDivisions.includes(enforcedDivision)) {
            return NextResponse.json({ error: "Forbidden: Unauthorized division scope" }, { status: 403 });
          }
          if (!enforcedDivision && managedDivisions.length === 1) {
            enforcedDivision = managedDivisions[0];
          }
        }
      }
    }

    // Build Query Filters
    const whereClause: Prisma.ReportWhereInput = {
      outbreakId,
    };

    if (statusParam !== "ALL") {
      whereClause.status = statusParam as any;
    }

    if (startDateParam || endDateParam) {
      whereClause.periodStart = {};
      if (startDateParam) {
        whereClause.periodStart.gte = new Date(`${startDateParam}T00:00:00.000Z`);
      }
      if (endDateParam) {
        whereClause.periodStart.lte = new Date(`${endDateParam}T23:59:59.999Z`);
      }
    }

    if (enforcedFacilityId) {
      whereClause.facilityId = enforcedFacilityId;
    } else if (enforcedDistrict || enforcedDivision) {
      whereClause.facility = {};
      if (enforcedDistrict) {
        whereClause.facility.district = enforcedDistrict;
      }
      if (enforcedDivision) {
        whereClause.facility.division = enforcedDivision;
      }
    }

    // Fast, lean query: Order strictly by Date and Facility Name
    const reports = await prisma.report.findMany({
      where: whereClause,
      select: {
        id: true,
        periodStart: true,
        createdAt: true,
        status: true,
        dataSnapshot: true,
        facility: {
          select: {
            facilityCode: true,
            facilityName: true,
            facilityType: true,
            division: true,
            district: true,
            upazila: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { periodStart: "asc" },
        { facility: { facilityName: "asc" } },
      ],
    });

    const filePrefix = `dghs_measles_raw_${startDateParam || "all"}_to_${endDateParam || "latest"}`;

    // ==========================================
    // 1. RAW CSV EXPORT (Ultra-fast & lean)
    // ==========================================
    if (format === "csv") {
      const csvHeaders = [
        "report_date",
        "facility_code",
        "facility_name",
        "facility_type",
        "division",
        "district",
        "upazila",
        "suspected_cases",
        "confirmed_cases",
        "suspected_deaths",
        "confirmed_deaths",
        "total_deaths",
        "admitted",
        "discharged",
        "serum_sent",
        "serum_tested",
        "is_nil_report",
        "status",
        "submitted_at",
        "reporter_name",
        "remarks",
      ];

      // Add UTF-8 BOM (\uFEFF) for immediate native Excel UTF-8 support
      const rows: string[] = ["\uFEFF" + csvHeaders.join(",")];

      for (const r of reports) {
        const snap = (r.dataSnapshot as Record<string, any>) || {};
        const suspected = Number(snap.suspected24h || 0);
        const confirmed = Number(snap.confirmed24h || 0);
        const admitted = Number(snap.admitted24h || 0);
        const discharged = Number(snap.discharged24h || 0);
        const suspDeath = Number(snap.suspectedDeath24h || 0);
        const confDeath = Number(snap.confirmedDeath24h || 0);
        const totalDeaths = suspDeath + confDeath;
        const serumSent = Number(snap.serumSent24h || 0);
        const serumTested = Number(snap.serumTested24h || snap.serumTested || 0);

        const isNilReport =
          suspected === 0 &&
          confirmed === 0 &&
          admitted === 0 &&
          discharged === 0 &&
          totalDeaths === 0;

        const dateStr = r.periodStart.toISOString().split("T")[0];
        const submittedAt = r.createdAt.toISOString().replace("T", " ").substring(0, 19);
        const remarks = snap.remarks || snap.comments || "";

        const row = [
          dateStr,
          escapeCsvField(r.facility?.facilityCode || ""),
          escapeCsvField(r.facility?.facilityName || ""),
          escapeCsvField(r.facility?.facilityType || ""),
          escapeCsvField(r.facility?.division || ""),
          escapeCsvField(r.facility?.district || ""),
          escapeCsvField(r.facility?.upazila || ""),
          suspected,
          confirmed,
          suspDeath,
          confDeath,
          totalDeaths,
          admitted,
          discharged,
          serumSent,
          serumTested,
          isNilReport ? "YES" : "NO",
          escapeCsvField(r.status),
          submittedAt,
          escapeCsvField(r.user?.name || ""),
          escapeCsvField(remarks),
        ];

        rows.push(row.join(","));
      }

      const csvContent = rows.join("\r\n");
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filePrefix}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    // ==========================================
    // 2. RAW EXCEL EXPORT (Direct In-Memory Generation)
    // ==========================================
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "DGHS National Outbreak Surveillance";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Raw_Data_by_Date_Facility", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    sheet.columns = [
      { header: "Report Date", key: "report_date", width: 14 },
      { header: "Facility Code", key: "facility_code", width: 14 },
      { header: "Facility Name", key: "facility_name", width: 32 },
      { header: "Facility Type", key: "facility_type", width: 16 },
      { header: "Division", key: "division", width: 14 },
      { header: "District", key: "district", width: 14 },
      { header: "Upazila", key: "upazila", width: 14 },
      { header: "Suspected (24h)", key: "suspected_cases", width: 16 },
      { header: "Confirmed (24h)", key: "confirmed_cases", width: 16 },
      { header: "Suspected Deaths", key: "suspected_deaths", width: 16 },
      { header: "Confirmed Deaths", key: "confirmed_deaths", width: 16 },
      { header: "Total Deaths", key: "total_deaths", width: 14 },
      { header: "Admitted (24h)", key: "admitted", width: 14 },
      { header: "Discharged (24h)", key: "discharged", width: 16 },
      { header: "Serum Sent", key: "serum_sent", width: 14 },
      { header: "Serum Tested", key: "serum_tested", width: 14 },
      { header: "Nil Report", key: "is_nil_report", width: 12 },
      { header: "Status", key: "status", width: 12 },
      { header: "Submitted At", key: "submitted_at", width: 20 },
      { header: "Reporter", key: "reporter_name", width: 22 },
      { header: "Remarks", key: "remarks", width: 28 },
    ];

    // Header styling: Dark slate with white bold text
    const headerRow = sheet.getRow(1);
    headerRow.height = 26;
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F172A" }, // slate-900
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    for (const r of reports) {
      const snap = (r.dataSnapshot as Record<string, any>) || {};
      const suspected = Number(snap.suspected24h || 0);
      const confirmed = Number(snap.confirmed24h || 0);
      const admitted = Number(snap.admitted24h || 0);
      const discharged = Number(snap.discharged24h || 0);
      const suspDeath = Number(snap.suspectedDeath24h || 0);
      const confDeath = Number(snap.confirmedDeath24h || 0);
      const totalDeaths = suspDeath + confDeath;
      const serumSent = Number(snap.serumSent24h || 0);
      const serumTested = Number(snap.serumTested24h || snap.serumTested || 0);

      const isNilReport =
        suspected === 0 &&
        confirmed === 0 &&
        admitted === 0 &&
        discharged === 0 &&
        totalDeaths === 0;

      const dateStr = r.periodStart.toISOString().split("T")[0];
      const submittedAt = r.createdAt.toISOString().replace("T", " ").substring(0, 19);
      const remarks = snap.remarks || snap.comments || "";

      sheet.addRow({
        report_date: dateStr,
        facility_code: r.facility?.facilityCode || "",
        facility_name: r.facility?.facilityName || "",
        facility_type: r.facility?.facilityType || "",
        division: r.facility?.division || "",
        district: r.facility?.district || "",
        upazila: r.facility?.upazila || "",
        suspected_cases: suspected,
        confirmed_cases: confirmed,
        suspected_deaths: suspDeath,
        confirmed_deaths: confDeath,
        total_deaths: totalDeaths,
        admitted,
        discharged,
        serum_sent: serumSent,
        serum_tested: serumTested,
        is_nil_report: isNilReport ? "YES" : "NO",
        status: r.status,
        submitted_at: submittedAt,
        reporter_name: r.user?.name || "",
        remarks,
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filePrefix}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Export generation error:", error);
    return NextResponse.json({ error: "Failed to generate export file" }, { status: 500 });
  }
}
