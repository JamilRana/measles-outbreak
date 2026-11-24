import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBdDateString, getBdTime } from "@/lib/timezone";
import { getCachedData } from "@/lib/redis";
import { hasPermission } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const outbreakId = searchParams.get("outbreakId") || "measles-2026";
    const dateQuery = searchParams.get("date") || "";
    const divisionQuery = searchParams.get("division") || "";
    const districtQuery = searchParams.get("district") || "";
    const statusQuery = (searchParams.get("status") || "ALL").toUpperCase();

    // Temporal context
    const todayStr = getBdDateString(getBdTime());
    const targetDateStr = dateQuery || todayStr;

    // RBAC Scoping
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized. Authentication required to view facility reporting compliance." },
        { status: 401 }
      );
    }
    const role = session.user.role || "";
    const userManagedDivisions = session.user.managedDivisions || [];
    const userManagedDistricts = session.user.managedDistricts || [];

    // Security check: non-admin users cannot escape their assigned geography
    const isGlobalViewer = role === "ADMIN" || role === "EDITOR" || role === "VIEWER" || hasPermission(role, "admin:view");
    let effectiveDivision = divisionQuery;
    let effectiveDistrict = districtQuery;

    if (!isGlobalViewer) {
      if (userManagedDivisions.length > 0 && (!effectiveDivision || !userManagedDivisions.includes(effectiveDivision))) {
        effectiveDivision = userManagedDivisions[0];
      }
      if (userManagedDistricts.length > 0 && (!effectiveDistrict || !userManagedDistricts.includes(effectiveDistrict))) {
        effectiveDistrict = userManagedDistricts[0];
      }
    }

    const scopeKey = `${session?.user?.id || 'anon'}_${role}`;
    const cacheKey = `compliance:${outbreakId}:${targetDateStr}:${effectiveDivision || 'all'}:${effectiveDistrict || 'all'}:${scopeKey}`;

    const result = await getCachedData(cacheKey, async () => {
      // 1. Fetch Outbreak Cutoff rules
      const outbreak = await prisma.outbreak.findUnique({
        where: { id: outbreakId },
        select: { cutoffHour: true, cutoffMinute: true, name: true }
      });

      const cutoffHour = outbreak?.cutoffHour ?? 10;
      const cutoffMinute = outbreak?.cutoffMinute ?? 0;

      // Cutoff in UTC: BST is UTC+6
      const [y, m, d] = targetDateStr.split("-").map(Number);
      const cutoffUtc = new Date(Date.UTC(y, m - 1, d, cutoffHour - 6, cutoffMinute, 0, 0));

      // Day range for periodStart in UTC
      const startOfDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));

      // 2. Fetch Active Facilities with applied filters
      const facilityWhere: any = { isActive: true };
      if (effectiveDivision) facilityWhere.division = effectiveDivision;
      if (effectiveDistrict) facilityWhere.district = effectiveDistrict;
      if (!isGlobalViewer) {
        if (userManagedDivisions.length > 0) facilityWhere.division = { in: userManagedDivisions };
        if (userManagedDistricts.length > 0) facilityWhere.district = { in: userManagedDistricts };
      }

      const facilities = await prisma.facility.findMany({
        where: facilityWhere,
        select: {
          id: true,
          facilityCode: true,
          facilityName: true,
          facilityType: true,
          division: true,
          district: true,
          upazila: true,
        },
        orderBy: [{ division: "asc" }, { district: "asc" }, { facilityName: "asc" }]
      });

      // 3. Fetch Reports for target date
      const reports = await prisma.report.findMany({
        where: {
          outbreakId,
          periodStart: {
            gte: startOfDay,
            lte: endOfDay,
          },
          facilityId: { in: facilities.map(f => f.id) },
        },
        select: {
          id: true,
          facilityId: true,
          createdAt: true,
          status: true,
          dataSnapshot: true,
        }
      });

      // Map facilityId -> Report
      const reportByFacility = new Map<string, typeof reports[0]>();
      for (const r of reports) {
        reportByFacility.set(r.facilityId, r);
      }

      // 4. Compute Metrics
      let submittedCount = 0;
      let onTimeCount = 0;
      let lateCount = 0;
      let missedCount = 0;
      let nilCount = 0;

      const divisionMap = new Map<string, { total: number; submitted: number; onTime: number; late: number; missed: number; nil: number }>();

      const facilityStatuses: any[] = [];

      for (const f of facilities) {
        const divName = f.division || "Unknown";
        if (!divisionMap.has(divName)) {
          divisionMap.set(divName, { total: 0, submitted: 0, onTime: 0, late: 0, missed: 0, nil: 0 });
        }
        const divStat = divisionMap.get(divName)!;
        divStat.total += 1;

        const report = reportByFacility.get(f.id);

        if (report) {
          submittedCount += 1;
          divStat.submitted += 1;

          const isOnTime = report.createdAt <= cutoffUtc;
          if (isOnTime) {
            onTimeCount += 1;
            divStat.onTime += 1;
          } else {
            lateCount += 1;
            divStat.late += 1;
          }

          const snap = (report.dataSnapshot as Record<string, any>) || {};
          const isNil = Boolean(
            snap.is_nil_report ||
            snap.isNilReport ||
            (Number(snap.suspected24h || 0) === 0 &&
              Number(snap.confirmed24h || 0) === 0 &&
              Number(snap.admitted24h || 0) === 0 &&
              Number(snap.discharged24h || 0) === 0 &&
              Number(snap.confirmedDeath24h || 0) === 0 &&
              Number(snap.suspectedDeath24h || 0) === 0)
          );

          if (isNil) {
            nilCount += 1;
            divStat.nil += 1;
          }

          facilityStatuses.push({
            facilityId: f.id,
            facilityCode: f.facilityCode,
            facilityName: f.facilityName,
            facilityType: f.facilityType || "Health Facility",
            division: f.division,
            district: f.district,
            upazila: f.upazila || "",
            status: isOnTime ? "ON_TIME" : "LATE",
            isNilReport: isNil,
            submittedAt: report.createdAt.toISOString(),
            reportId: report.id,
          });
        } else {
          missedCount += 1;
          divStat.missed += 1;

          facilityStatuses.push({
            facilityId: f.id,
            facilityCode: f.facilityCode,
            facilityName: f.facilityName,
            facilityType: f.facilityType || "Health Facility",
            division: f.division,
            district: f.district,
            upazila: f.upazila || "",
            status: "MISSED",
            isNilReport: false,
            submittedAt: null,
            reportId: null,
          });
        }
      }

      const totalFacilities = facilities.length;
      const complianceRate = totalFacilities > 0 ? (submittedCount / totalFacilities) * 100 : 0;
      const onTimeRate = totalFacilities > 0 ? (onTimeCount / totalFacilities) * 100 : 0;

      const byDivision = Array.from(divisionMap.entries()).map(([division, s]) => ({
        division,
        total: s.total,
        submitted: s.submitted,
        onTime: s.onTime,
        late: s.late,
        missed: s.missed,
        nil: s.nil,
        complianceRate: s.total > 0 ? Number(((s.submitted / s.total) * 100).toFixed(1)) : 0,
        onTimeRate: s.total > 0 ? Number(((s.onTime / s.total) * 100).toFixed(1)) : 0,
      })).sort((a, b) => b.complianceRate - a.complianceRate);

      return {
        date: targetDateStr,
        cutoffTime: `${String(cutoffHour).padStart(2, "0")}:${String(cutoffMinute).padStart(2, "0")} BST`,
        cutoffTimestampUtc: cutoffUtc.toISOString(),
        metrics: {
          totalFacilities,
          submittedCount,
          onTimeCount,
          lateCount,
          missedCount,
          nilCount,
          complianceRate: Number(complianceRate.toFixed(1)),
          onTimeRate: Number(onTimeRate.toFixed(1)),
        },
        byDivision,
        facilities: facilityStatuses,
      };
    }, 120); // 120s TTL

    // Filter response facilities by status if requested
    let filteredFacilities = result.facilities;
    if (statusQuery === "ON_TIME") {
      filteredFacilities = filteredFacilities.filter((f: any) => f.status === "ON_TIME");
    } else if (statusQuery === "LATE") {
      filteredFacilities = filteredFacilities.filter((f: any) => f.status === "LATE");
    } else if (statusQuery === "MISSED") {
      filteredFacilities = filteredFacilities.filter((f: any) => f.status === "MISSED");
    } else if (statusQuery === "NIL") {
      filteredFacilities = filteredFacilities.filter((f: any) => f.isNilReport);
    }

    return NextResponse.json({
      ...result,
      facilities: filteredFacilities,
      totalMatched: filteredFacilities.length,
    });
  } catch (error: any) {
    console.error("[Compliance API Error]", error);
    return NextResponse.json({ error: "Failed to generate compliance report", details: error.message }, { status: 500 });
  }
}
