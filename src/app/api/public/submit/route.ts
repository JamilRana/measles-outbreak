import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBdTime, getBdStartOfDay, getBdEndOfDay } from "@/lib/timezone";

async function getSettings() {
  const settings = await prisma.settings.findFirst();
  return {
    cutoffHour: settings?.cutoffHour ?? 14,
    cutoffMinute: settings?.cutoffMinute ?? 0,
    editDeadlineHour: settings?.editDeadlineHour ?? 10,
    editDeadlineMinute: settings?.editDeadlineMinute ?? 0,
    defaultOutbreakId: (settings as any)?.defaultOutbreakId,
  };
}

function checkIsEditable(deadlineHour: number, deadlineMinute: number): boolean {
  const now = getBdTime();
  const deadline = new Date(now);
  deadline.setHours(deadlineHour, deadlineMinute, 0, 0);
  return now <= deadline;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      facilityId,
      facilityCode,
      outbreakId,
      suspected24h, 
      confirmed24h, 
      suspectedDeath24h, 
      confirmedDeath24h, 
      admitted24h, 
      discharged24h, 
      serumSent24h,
      dynamicFields
    } = body;

    const settings = await getSettings();
    const targetOutbreakId = outbreakId || settings.defaultOutbreakId;

    if (!targetOutbreakId) {
      return NextResponse.json({ error: "No active outbreak selected" }, { status: 400 });
    }

    const now = getBdTime();
    const startOfDay = getBdStartOfDay();
    const endOfDay = getBdEndOfDay();

    let facility;
    if (facilityId) {
      facility = await prisma.facility.findUnique({ where: { id: facilityId } });
    } else if (facilityCode) {
      facility = await prisma.facility.findUnique({ where: { facilityCode } });
    }

    if (!facility || !facility.isActive) {
      return NextResponse.json({ error: "Invalid or inactive facility" }, { status: 400 });
    }

    const existing = await prisma.dailyReport.findFirst({
      where: {
        facilityId: facility.id,
        outbreakId: targetOutbreakId as any,
        reportingDate: { gte: startOfDay, lte: endOfDay }
      }
    });

    if (existing) {
      const canEdit = !(existing as any).isLocked && checkIsEditable(settings.editDeadlineHour, settings.editDeadlineMinute);
      return NextResponse.json({ 
        error: "Report already exists",
        existingId: existing.id,
        existingData: {
          suspected24h: existing.suspected24h,
          confirmed24h: existing.confirmed24h,
          suspectedDeath24h: existing.suspectedDeath24h,
          confirmedDeath24h: existing.confirmedDeath24h,
          admitted24h: existing.admitted24h,
          discharged24h: existing.discharged24h,
          serumSent24h: existing.serumSent24h,
        },
        canEdit,
        mode: canEdit ? "EDIT" : "VIEW"
      });
    }

    // Check submission cutoff
    const cutoff = new Date(now);
    cutoff.setHours(settings.cutoffHour, settings.cutoffMinute, 0, 0);
    if (now > cutoff) {
      return NextResponse.json({ 
        error: `Submission deadline has passed (${String(settings.cutoffHour).padStart(2, '0')}:${String(settings.cutoffMinute).padStart(2, '0')}).`,
        mode: "VIEW"
      }, { status: 400 });
    }

    const adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      orderBy: { createdAt: "asc" },
    });

    const report = await prisma.$transaction(async (tx) => {
      const newReport = await tx.dailyReport.create({
        data: {
          reportingDate: new Date(),
          facilityId: facility.id,
          userId: adminUser?.id || "public-submission",
          outbreakId: targetOutbreakId,
          suspected24h: Number(suspected24h) || 0,
          confirmed24h: Number(confirmed24h) || 0,
          suspectedDeath24h: Number(suspectedDeath24h) || 0,
          confirmedDeath24h: Number(confirmedDeath24h) || 0,
          admitted24h: Number(admitted24h) || 0,
          discharged24h: Number(discharged24h) || 0,
          serumSent24h: Number(serumSent24h) || 0,
        }
      });

      if (dynamicFields && typeof dynamicFields === 'object') {
        const fieldValuesData = Object.entries(dynamicFields).map(([formFieldId, value]) => ({
          reportId: newReport.id,
          formFieldId: formFieldId,
          value: String(value),
        }));
        if (fieldValuesData.length > 0) {
          await tx.reportFieldValue.createMany({ data: fieldValuesData });
        }
      }
      return newReport;
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
    const { 
      reportId,
      suspected24h, 
      confirmed24h, 
      suspectedDeath24h, 
      confirmedDeath24h, 
      admitted24h, 
      discharged24h, 
      serumSent24h,
      dynamicFields
    } = body;

    const report = await prisma.dailyReport.findUnique({ where: { id: reportId } });
    if (!report || (report as any).isLocked) {
      return NextResponse.json({ error: "Report is locked or not found" }, { status: 403 });
    }

    const settings = await getSettings();
    if (!checkIsEditable(settings.editDeadlineHour, settings.editDeadlineMinute)) {
      return NextResponse.json({ error: "Edit deadline passed" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.dailyReport.update({
        where: { id: reportId },
        data: {
          suspected24h: Number(suspected24h) || 0,
          confirmed24h: Number(confirmed24h) || 0,
          suspectedDeath24h: Number(suspectedDeath24h) || 0,
          confirmedDeath24h: Number(confirmedDeath24h) || 0,
          admitted24h: Number(admitted24h) || 0,
          discharged24h: Number(discharged24h) || 0,
          serumSent24h: Number(serumSent24h) || 0,
        }
      });

      if (dynamicFields && typeof dynamicFields === 'object') {
        for (const [formFieldId, value] of Object.entries(dynamicFields)) {
          await tx.reportFieldValue.upsert({
            where: { reportId_formFieldId: { reportId, formFieldId } },
            update: { value: String(value) },
            create: { reportId, formFieldId, value: String(value) },
          });
        }
      }
    });

    return NextResponse.json({ success: true, id: reportId, message: "Report updated", mode: "EDIT" });
  } catch (error) {
    console.error("Public update error:", error);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}