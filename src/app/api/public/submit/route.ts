import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBdTime, getBdDateString } from "@/lib/timezone";
import { getActiveWindow } from "@/lib/submission-window";
import { rebuildSnapshot } from "@/lib/snapshot";
import { ReportStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validateForm } from "@/lib/validation-engine";

async function getSettings() {
  const settings = await prisma.settings.findFirst();
  return {
    defaultOutbreakId: settings?.defaultOutbreakId,
  };
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const existingId = searchParams.get("existingId");

    const body = await request.json();
    const { 
      facilityId,
      facilityCode,
      outbreakId,
      dynamicFields,
      reportingDate
    } = body;

    const settings = await getSettings();
    const targetOutbreakId = outbreakId || settings.defaultOutbreakId;

    if (!targetOutbreakId) {
      return NextResponse.json({ error: "No active outbreak selected" }, { status: 400 });
    }

    const reportDate = reportingDate ? new Date(reportingDate) : getBdTime();

    // 1. Resolve Facility
    let facility;
    if (facilityId) {
      facility = await prisma.facility.findUnique({ where: { id: facilityId } });
    } else if (facilityCode) {
      facility = await prisma.facility.findUnique({ where: { facilityCode } });
    }

    if (!facility || !facility.isActive) {
      return NextResponse.json({ error: "Invalid or inactive facility" }, { status: 400 });
    }

    // 2. Validation: Submission Window Check - simplified check
    const outbreak = await prisma.outbreak.findUnique({
      where: { id: targetOutbreakId },
      select: {
        allowBacklogReporting: true,
        backlogStartDate: true,
        backlogEndDate: true,
      }
    });

    const today = getBdDateString();
    const reportDateStr = reportDate.toISOString().split('T')[0];
    let windowOpen = false;
    let windowType = 'FALLBACK';

    if (reportDateStr === today) {
      windowOpen = true;
      windowType = 'FALLBACK';
    } else if (outbreak?.allowBacklogReporting) {
      const start = outbreak.backlogStartDate;
      const end = outbreak.backlogEndDate;
      if ((!start || reportDate >= start) && (!end || reportDate <= end)) {
        windowOpen = true;
        windowType = 'BACKLOG';
      }
    }

    if (!windowOpen) {
      return NextResponse.json({ 
        error: "Submission window is closed for this period",
        mode: "VIEW"
      }, { status: 403 });
    }

    // 3. Server-side field validation (same engine as client)
    if (dynamicFields && typeof dynamicFields === 'object') {
      const formFields = await prisma.formField.findMany({
        where: { outbreakId: targetOutbreakId },
        orderBy: { sortOrder: 'asc' },
      });

      // Build fieldKey → value map (dynamicFields is keyed by formField.id)
      const valuesByKey: Record<string, string> = {};
      for (const field of formFields) {
        const raw = (dynamicFields as Record<string, string>)[field.id];
        if (raw !== undefined) valuesByKey[field.fieldKey] = raw;
      }

      const validationResults = validateForm(
        formFields.map(f => ({
          fieldKey: f.fieldKey,
          label: f.label,
          isRequired: f.isRequired,
          validationRules: Array.isArray(f.validationRules) ? (f.validationRules as any[]) : [],
        })),
        valuesByKey
      );

      const blockingErrors = validationResults.filter(r => r.severity === 'error');
      if (blockingErrors.length > 0) {
        return NextResponse.json({
          error: 'Validation failed',
          validationErrors: blockingErrors,
        }, { status: 422 });
      }
    }

    // 4. Handle Updates if existingId or Duplicate Found
    if (existingId) {
       // ... existingId logic moved to modern Report logic below if needed
    }

    const existingModern = await prisma.report.findFirst({
      where: {
        facilityId: facility.id,
        outbreakId: targetOutbreakId,
        periodStart: reportDate
      }
    });

    if (existingModern) {
      if (existingModern.isLocked) {
        return NextResponse.json({ error: "Report is locked", mode: "VIEW" }, { status: 403 });
      }
      return NextResponse.json({ 
        error: "Report already exists",
        existingId: existingModern.id,
        mode: "EDIT"
      });
    }

    // 4. Create Modern Report
    const report = await prisma.$transaction(async (tx) => {
      const newReport = await tx.report.create({
        data: {
          periodStart: reportDate,
          periodEnd: reportDate,
          facilityId: facility.id,
          userId: "public-submission", // Placeholder if no session
          outbreakId: targetOutbreakId,
          status: ReportStatus.SUBMITTED,
        }
      });

      if (dynamicFields && typeof dynamicFields === 'object') {
        const fieldValuesData = Object.entries(dynamicFields).map(([formFieldId, value]) => ({
          modernReportId: newReport.id,
          formFieldId: formFieldId,
          value: String(value),
        }));

        if (fieldValuesData.length > 0) {
          await tx.reportFieldValue.createMany({ data: fieldValuesData });
        }
      }

      // Populate snapshot
      const snapshot = await rebuildSnapshot(newReport.id, tx);
      return await tx.report.update({
        where: { id: newReport.id },
        data: { dataSnapshot: snapshot as any }
      });
    }, {
      timeout: 15000 // Increase timeout to 15s to handle rebuildSnapshot complexity
    });

    return NextResponse.json({ success: true, id: report.id, message: "Report submitted", mode: "CREATE" });
  } catch (error) {
    console.error("Public submit error:", error);
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { reportId, dynamicFields } = body;

    if (!reportId) {
      return NextResponse.json({ error: "Missing report ID" }, { status: 400 });
    }

    const existingModern = await prisma.report.findUnique({ where: { id: reportId } });
    if (!existingModern) {
       // Potential legacy support:
       const existingLegacy = await prisma.dailyReport.findUnique({ where: { id: reportId } });
       if (!existingLegacy) return NextResponse.json({ error: "Report not found" }, { status: 404 });
       // Legacy edit logic ... (optional)
       return NextResponse.json({ error: "Legacy reports cannot be edited via this route" }, { status: 403 });
    }

    if (existingModern.isLocked) {
      return NextResponse.json({ error: "Report is locked" }, { status: 403 });
    }

    // Server-side field validation (same engine as client, same rules)
    if (dynamicFields && typeof dynamicFields === 'object') {
      const formFields = await prisma.formField.findMany({
        where: { outbreakId: existingModern.outbreakId },
        orderBy: { sortOrder: 'asc' },
      });

      const valuesByKey: Record<string, string> = {};
      for (const field of formFields) {
        const raw = (dynamicFields as Record<string, string>)[field.id];
        if (raw !== undefined) valuesByKey[field.fieldKey] = raw;
      }

      const { validateForm } = await import('@/lib/validation-engine');
      const validationResults = validateForm(
        formFields.map(f => ({
          fieldKey: f.fieldKey,
          label: f.label,
          isRequired: f.isRequired,
          validationRules: Array.isArray(f.validationRules) ? (f.validationRules as any[]) : [],
        })),
        valuesByKey
      );

      const blockingErrors = validationResults.filter(r => r.severity === 'error');
      if (blockingErrors.length > 0) {
        return NextResponse.json({
          error: 'Validation failed',
          validationErrors: blockingErrors,
        }, { status: 422 });
      }
    }

    const report = await prisma.$transaction(async (tx) => {
      // Optimized: Batch update values using delete/create instead of serial upserts
      if (dynamicFields && typeof dynamicFields === 'object') {
        // 1. Remove existing values for this report
        await tx.reportFieldValue.deleteMany({
          where: { modernReportId: reportId }
        });

        // 2. Insert new values
        const fieldValuesData = Object.entries(dynamicFields).map(([formFieldId, value]) => ({
          modernReportId: reportId,
          formFieldId: formFieldId,
          value: String(value),
        }));

        if (fieldValuesData.length > 0) {
          await tx.reportFieldValue.createMany({ data: fieldValuesData });
        }
      }

      // Rebuild snapshot
      const snapshot = await rebuildSnapshot(reportId, tx);
      return await tx.report.update({
        where: { id: reportId },
        data: { dataSnapshot: snapshot as any }
      });
    }, {
      timeout: 15000 // Increase timeout to 15s
    });

    return NextResponse.json({ success: true, id: report.id, message: "Report updated", mode: "EDIT" });
  } catch (error) {
    console.error("Public update error:", error);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}