import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createAuditLog, AuditActions } from '@/lib/audit';
import { hasPermission } from '@/lib/rbac';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const summary = searchParams.get('summary') === 'true';
    const session = await getServerSession(authOptions);

    // Filters
    const outbreakId = searchParams.get('outbreakId');
    const date = searchParams.get('date');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const facilityId = searchParams.get('facilityId');
    const division = searchParams.get('division');
    const district = searchParams.get('district');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const where: any = {};
    
    // RBAC Data Scoping
    if (session?.user) {
      if (session.user.role === 'USER') {
        where.facilityId = session.user.facilityId;
      } else if (session.user.role === 'EDITOR') {
        const managedDivs = session.user.managedDivisions || [];
        const managedDist = session.user.managedDistricts || [];
        where.facility = {};
        if (managedDivs.length > 0) where.facility.division = { in: managedDivs };
        if (managedDist.length > 0) where.facility.district = { in: managedDist };
        if (managedDivs.length === 0 && managedDist.length === 0) where.facility.division = session.user.division;
      }
    }

    if (outbreakId) {
      where.outbreakId = outbreakId;
    } else {
      const settings = await prisma.settings.findFirst();
      if (settings?.defaultOutbreakId) where.outbreakId = settings.defaultOutbreakId;
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.reportingDate = { gte: startOfDay, lte: endOfDay };
    }

    if (summary) {
      const reports = await prisma.dailyReport.findMany({
        where,
        include: {
          fieldValues: {
            include: { formField: true }
          }
        }
      });

      const totals = reports.reduce((acc, r) => {
        const dynamicSuspected = r.fieldValues.find(f => f.formField.fieldKey === 'suspected24h')?.value;
        const dynamicConfirmed = r.fieldValues.find(f => f.formField.fieldKey === 'confirmed24h')?.value;
        const dynamicSDeath = r.fieldValues.find(f => f.formField.fieldKey === 'suspectedDeath24h')?.value;
        const dynamicCDeath = r.fieldValues.find(f => f.formField.fieldKey === 'confirmedDeath24h')?.value;
        const dynamicAdmitted = r.fieldValues.find(f => f.formField.fieldKey === 'admitted24h')?.value;

        acc.suspected += dynamicSuspected ? Number(dynamicSuspected) : r.suspected24h;
        acc.confirmed += dynamicConfirmed ? Number(dynamicConfirmed) : r.confirmed24h;
        acc.deaths += (dynamicSDeath ? Number(dynamicSDeath) : r.suspectedDeath24h) + 
                      (dynamicCDeath ? Number(dynamicCDeath) : r.confirmedDeath24h);
        acc.hospitalized += dynamicAdmitted ? Number(dynamicAdmitted) : r.admitted24h;
        return acc;
      }, { suspected: 0, confirmed: 0, deaths: 0, hospitalized: 0 });

      return NextResponse.json({ totals });
    }

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (from && to) {
      const startDate = new Date(from);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
      where.reportingDate = { gte: startDate, lte: endDate };
    }

    if (facilityId && session?.user?.role !== 'USER') {
      where.facilityId = facilityId;
    }
    
    if (division && session?.user?.role === 'ADMIN') {
      where.facility = { ...where.facility, division };
    }
    
    if (district) {
      where.facility = { ...where.facility, district };
    }

    const total = await prisma.dailyReport.count({ where });
    const reports = await prisma.dailyReport.findMany({
      where,
      orderBy: { reportingDate: 'desc' },
      skip: skip,
      take: limit,
      include: {
        facility: {
          select: {
            id: true,
            facilityName: true,
            division: true,
            district: true,
            facilityCode: true,
          }
        },
        outbreak: {
          select: { name: true }
        },
        fieldValues: {
          include: {
            formField: {
              select: { label: true, fieldKey: true }
            }
          }
        }
      }
    });

    return NextResponse.json({
      reports,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Reports GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.facilityId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user.role, 'report:create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      outbreakId, 
      reportingDate, 
      suspected24h, 
      confirmed24h, 
      suspectedDeath24h, 
      confirmedDeath24h, 
      admitted24h, 
      discharged24h, 
      serumSent24h,
      dynamicFields // Expected as { [fieldId]: value }
    } = body;

    if (!outbreakId) {
      return NextResponse.json({ error: 'Outbreak ID is required' }, { status: 400 });
    }

    const reportDate = new Date(reportingDate);
    const startOfDay = new Date(reportDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await prisma.dailyReport.findFirst({
      where: {
        facilityId: session.user.facilityId,
        outbreakId: outbreakId,
        reportingDate: { gte: startOfDay, lte: endOfDay }
      }
    });

    if (existing) {
      return NextResponse.json({ 
        error: 'Report already exists for this outbreak and date', 
        existingId: existing.id,
        mode: 'EDIT' 
      }, { status: 400 });
    }

    // Create the report and field values in a transaction
    const report = await prisma.$transaction(async (tx) => {
      const newReport = await tx.dailyReport.create({
        data: {
          reportingDate: reportDate,
          facilityId: session.user.facilityId,
          userId: session.user.id,
          outbreakId: outbreakId,
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
          await tx.reportFieldValue.createMany({
            data: fieldValuesData
          });
        }
      }

      return newReport;
    });

    await createAuditLog({
      userId: session.user.id,
      action: AuditActions.REPORT_CREATE,
      entityType: 'DailyReport',
      entityId: report.id,
      details: { reportingDate, outbreakId, suspected24h, confirmed24h },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error('Report POST error:', error);
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }
}