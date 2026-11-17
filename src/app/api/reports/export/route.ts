import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getBdTime, getBdDateString } from "@/lib/timezone";
import * as XLSX from "xlsx";

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
    const monthParam = searchParams.get("month") || "";
    const startDateParam = searchParams.get("startDate") || "";
    const endDateParam = searchParams.get("endDate") || "";

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
        // District/Division Supervisor Scoping
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

    // Determine Date Range
    let startDate: string | undefined;
    let endDate: string | undefined;

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const monthRegex = /^\d{4}-\d{2}$/;

    if (monthParam && monthRegex.test(monthParam)) {
      const [yStr, mStr] = monthParam.split("-");
      const year = parseInt(yStr, 10);
      const month = parseInt(mStr, 10);
      const lastDay = new Date(year, month, 0).getDate();
      startDate = `${monthParam}-01`;
      endDate = `${monthParam}-${String(lastDay).padStart(2, "0")}`;
    } else {
      if (startDateParam && dateRegex.test(startDateParam)) {
        startDate = startDateParam;
      }
      if (endDateParam && dateRegex.test(endDateParam)) {
        endDate = endDateParam;
      }
    }

    // Build Prisma query filter
    const where: Prisma.ReportWhereInput = {
      outbreakId,
    };

    if (statusParam === "PUBLISHED") {
      where.status = "PUBLISHED";
    } else if (statusParam !== "ALL") {
      where.status = statusParam as any;
    }

    if (startDate && endDate) {
      where.periodStart = {
        gte: new Date(`${startDate}T00:00:00.000Z`),
        lte: new Date(`${endDate}T23:59:59.999Z`),
      };
    } else if (startDate) {
      where.periodStart = {
        gte: new Date(`${startDate}T00:00:00.000Z`),
      };
    } else if (endDate) {
      where.periodStart = {
        lte: new Date(`${endDate}T23:59:59.999Z`),
      };
    }

    const facilityFilter: Prisma.FacilityWhereInput = {};
    if (enforcedFacilityId) facilityFilter.id = enforcedFacilityId;
    if (enforcedDistrict) {
      facilityFilter.district = enforcedDistrict;
    } else if (managedDistricts.length > 0 && !isSuperAdmin) {
      facilityFilter.district = { in: managedDistricts };
    }
    if (enforcedDivision) {
      facilityFilter.division = enforcedDivision;
    } else if (managedDivisions.length > 0 && !isSuperAdmin) {
      facilityFilter.division = { in: managedDivisions };
    }

    if (Object.keys(facilityFilter).length > 0) {
      where.facility = facilityFilter;
    }

    // Fetch reports with facility and user relations
    const reports = await prisma.report.findMany({
      where,
      orderBy: [{ periodStart: "asc" }, { facility: { facilityName: "asc" } }],
      include: {
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
    });

    const filePrefix = `measles_report_${startDate || "all"}_to_${endDate || "latest"}`;

    // ==========================================
    // 1. CSV EXPORT (Machine-readable for STATA/R)
    // ==========================================
    if (format === "csv") {
      const headers = [
        "report_id",
        "facility_code",
        "facility_name",
        "facility_type",
        "division",
        "district",
        "upazila",
        "period_date",
        "status",
        "suspected_24h",
        "confirmed_24h",
        "admitted_24h",
        "discharged_24h",
        "suspected_death_24h",
        "confirmed_death_24h",
        "total_deaths_24h",
        "serum_sent_24h",
        "submitted_by_name",
        "submitted_by_email",
        "created_at",
        "updated_at",
      ];

      const rows: string[] = [headers.join(",")];

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

        const periodDateStr = r.periodStart.toISOString().split("T")[0];

        const row = [
          escapeCsvField(r.id),
          escapeCsvField(r.facility?.facilityCode || ""),
          escapeCsvField(r.facility?.facilityName || ""),
          escapeCsvField(r.facility?.facilityType || ""),
          escapeCsvField(r.facility?.division || ""),
          escapeCsvField(r.facility?.district || ""),
          escapeCsvField(r.facility?.upazila || ""),
          escapeCsvField(periodDateStr),
          escapeCsvField(r.status),
          suspected,
          confirmed,
          admitted,
          discharged,
          suspDeath,
          confDeath,
          totalDeaths,
          serumSent,
          escapeCsvField(r.user?.name || ""),
          escapeCsvField(r.user?.email || ""),
          escapeCsvField(r.createdAt.toISOString()),
          escapeCsvField(r.updatedAt.toISOString()),
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
    // 2. EXCEL EXPORT (Multi-sheet styled workbook)
    // ==========================================
    const wb = XLSX.utils.book_new();

    // Aggregations
    let totalSuspected = 0;
    let totalConfirmed = 0;
    let totalAdmitted = 0;
    let totalDischarged = 0;
    let totalSuspDeath = 0;
    let totalConfDeath = 0;
    let totalSerumSent = 0;

    const facilityMap = new Map<string, {
      code: string;
      name: string;
      type: string;
      division: string;
      district: string;
      upazila: string;
      reportsCount: number;
      suspected: number;
      confirmed: number;
      admitted: number;
      discharged: number;
      suspDeath: number;
      confDeath: number;
      totalDeaths: number;
      serumSent: number;
      lastReportedDate: string;
    }>();

    const dateMap = new Map<string, {
      date: string;
      reportsCount: number;
      suspected: number;
      confirmed: number;
      admitted: number;
      discharged: number;
      suspDeath: number;
      confDeath: number;
      totalDeaths: number;
      serumSent: number;
    }>();

    const rawRows: any[] = [];

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

      totalSuspected += suspected;
      totalConfirmed += confirmed;
      totalAdmitted += admitted;
      totalDischarged += discharged;
      totalSuspDeath += suspDeath;
      totalConfDeath += confDeath;
      totalSerumSent += serumSent;

      const dateStr = r.periodStart.toISOString().split("T")[0];

      // Facility Aggregation
      const fKey = r.facilityId;
      if (!facilityMap.has(fKey)) {
        facilityMap.set(fKey, {
          code: r.facility?.facilityCode || "",
          name: r.facility?.facilityName || "",
          type: r.facility?.facilityType || "",
          division: r.facility?.division || "",
          district: r.facility?.district || "",
          upazila: r.facility?.upazila || "",
          reportsCount: 0,
          suspected: 0,
          confirmed: 0,
          admitted: 0,
          discharged: 0,
          suspDeath: 0,
          confDeath: 0,
          totalDeaths: 0,
          serumSent: 0,
          lastReportedDate: dateStr,
        });
      }
      const fStat = facilityMap.get(fKey)!;
      fStat.reportsCount += 1;
      fStat.suspected += suspected;
      fStat.confirmed += confirmed;
      fStat.admitted += admitted;
      fStat.discharged += discharged;
      fStat.suspDeath += suspDeath;
      fStat.confDeath += confDeath;
      fStat.totalDeaths += totalDeaths;
      fStat.serumSent += serumSent;
      if (dateStr > fStat.lastReportedDate) {
        fStat.lastReportedDate = dateStr;
      }

      // Date Timeline Aggregation
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, {
          date: dateStr,
          reportsCount: 0,
          suspected: 0,
          confirmed: 0,
          admitted: 0,
          discharged: 0,
          suspDeath: 0,
          confDeath: 0,
          totalDeaths: 0,
          serumSent: 0,
        });
      }
      const dStat = dateMap.get(dateStr)!;
      dStat.reportsCount += 1;
      dStat.suspected += suspected;
      dStat.confirmed += confirmed;
      dStat.admitted += admitted;
      dStat.discharged += discharged;
      dStat.suspDeath += suspDeath;
      dStat.confDeath += confDeath;
      dStat.totalDeaths += totalDeaths;
      dStat.serumSent += serumSent;

      // Raw Row
      rawRows.push({
        "Report ID": r.id,
        "Facility Code": r.facility?.facilityCode || "",
        "Facility Name": r.facility?.facilityName || "",
        "Facility Type": r.facility?.facilityType || "",
        "Division": r.facility?.division || "",
        "District": r.facility?.district || "",
        "Upazila": r.facility?.upazila || "",
        "Date": dateStr,
        "Status": r.status,
        "Suspected": suspected,
        "Confirmed": confirmed,
        "Admitted": admitted,
        "Discharged": discharged,
        "Suspected Deaths": suspDeath,
        "Confirmed Deaths": confDeath,
        "Total Deaths": totalDeaths,
        "Serum Sent": serumSent,
        "Submitted By": r.user?.name || r.user?.email || "",
        "Submitted At": r.createdAt.toISOString().replace("T", " ").substring(0, 19),
      });
    }

    const totalDeathsAll = totalSuspDeath + totalConfDeath;
    const totalCasesAll = totalSuspected + totalConfirmed;
    const suspectedCFR = totalSuspected > 0 ? ((totalSuspDeath / totalSuspected) * 100).toFixed(2) + "%" : "0.00%";
    const confirmedCFR = totalConfirmed > 0 ? ((totalConfDeath / totalConfirmed) * 100).toFixed(2) + "%" : "0.00%";
    const overallCFR = totalCasesAll > 0 ? ((totalDeathsAll / totalCasesAll) * 100).toFixed(2) + "%" : "0.00%";

    // Sheet 1: Executive Summary
    const summaryRows = [
      ["DGHS MEASLES OUTBREAK SURVEILLANCE DOSSIER"],
      ["Generated At (BST)", getBdTime().toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })],
      ["Outbreak Identifier", outbreakId],
      ["Reporting Status", statusParam],
      ["Date Range Filter", startDate && endDate ? `${startDate} to ${endDate}` : "All Recorded Periods"],
      ["Division Filter", enforcedDivision || "All Divisions"],
      ["District Filter", enforcedDistrict || "All Districts"],
      ["Total Submissions Analyzed", reports.length],
      ["Unique Reporting Facilities", facilityMap.size],
      [],
      ["EPIDEMIOLOGICAL KEY PERFORMANCE INDICATORS", "VALUE"],
      ["Total Suspected Cases (24h)", totalSuspected],
      ["Total Lab-Confirmed Cases (24h)", totalConfirmed],
      ["Total Cumulative Measles Cases", totalCasesAll],
      ["Total Inpatients Admitted (24h)", totalAdmitted],
      ["Total Inpatients Discharged (24h)", totalDischarged],
      ["Suspected Measles Deaths (24h)", totalSuspDeath],
      ["Confirmed Measles Deaths (24h)", totalConfDeath],
      ["Total Measles Deaths (24h)", totalDeathsAll],
      ["Suspected Case Fatality Rate (CFR)", suspectedCFR],
      ["Confirmed Case Fatality Rate (CFR)", confirmedCFR],
      ["Overall Case Fatality Rate (CFR)", overallCFR],
      ["Total Serum Samples Sent for Testing", totalSerumSent],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary["!cols"] = [{ wch: 38 }, { wch: 32 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Executive Summary");

    // Sheet 2: Facility-wise Matrix
    const facilityRows = Array.from(facilityMap.values()).map((f) => ({
      "Facility Code": f.code,
      "Facility Name": f.name,
      "Facility Type": f.type,
      "Division": f.division,
      "District": f.district,
      "Upazila": f.upazila,
      "Reports Count": f.reportsCount,
      "Total Suspected": f.suspected,
      "Total Confirmed": f.confirmed,
      "Total Admitted": f.admitted,
      "Total Discharged": f.discharged,
      "Suspected Deaths": f.suspDeath,
      "Confirmed Deaths": f.confDeath,
      "Total Deaths": f.totalDeaths,
      "Serum Sent": f.serumSent,
      "Last Reported Date": f.lastReportedDate,
    }));
    const wsFacility = XLSX.utils.json_to_sheet(facilityRows);
    wsFacility["!cols"] = [
      { wch: 14 },
      { wch: 36 },
      { wch: 18 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, wsFacility, "Facility Matrix");

    // Sheet 3: Date-wise Timeline
    const dateSorted = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    let cumSuspected = 0;
    let cumConfirmed = 0;
    let cumDeaths = 0;
    const dateRows = dateSorted.map((d) => {
      cumSuspected += d.suspected;
      cumConfirmed += d.confirmed;
      cumDeaths += d.totalDeaths;
      return {
        "Date": d.date,
        "Facilities Reporting": d.reportsCount,
        "Suspected (24h)": d.suspected,
        "Confirmed (24h)": d.confirmed,
        "Admitted (24h)": d.admitted,
        "Discharged (24h)": d.discharged,
        "Suspected Deaths": d.suspDeath,
        "Confirmed Deaths": d.confDeath,
        "Total Deaths (24h)": d.totalDeaths,
        "Serum Sent (24h)": d.serumSent,
        "Cumulative Suspected": cumSuspected,
        "Cumulative Confirmed": cumConfirmed,
        "Cumulative Deaths": cumDeaths,
      };
    });
    const wsDate = XLSX.utils.json_to_sheet(dateRows);
    wsDate["!cols"] = [
      { wch: 14 },
      { wch: 20 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 16 },
      { wch: 20 },
      { wch: 20 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, wsDate, "Date Timeline");

    // Sheet 4: Raw Submissions
    const wsRaw = XLSX.utils.json_to_sheet(rawRows);
    wsRaw["!cols"] = [
      { wch: 26 },
      { wch: 14 },
      { wch: 34 },
      { wch: 16 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 12 },
      { wch: 24 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, wsRaw, "Raw Submissions");

    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(excelBuffer, {
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
