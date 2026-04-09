import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createAuditLog, AuditActions } from '@/lib/audit';
import { hasPermission } from '@/lib/rbac';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const outbreakId = searchParams.get('outbreakId');
    const date = searchParams.get('date');
    const facilityId = searchParams.get('facilityId');
    const division = searchParams.get('division');
    const district = searchParams.get('district');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: any = {};
    
    // RBAC Data Scoping
    if (session.user.role === 'USER') {
      where.facilityId = session.user.facilityId;
    } else if (session.user.role === 'EDITOR') {
      const managedDivs = session.user.managedDivisions || [];
      const managedDist = session.user.managedDistricts || [];
      
      where.facility = {};
      if (managedDivs.length > 0) {
        where.facility.division = { in: managedDivs };
      }
      if (managedDist.length > 0) {
        where.facility.district = { in: managedDist };
      }
      
      // If none explicitly managed, fallback to their own facility's division
      if (managedDivs.length === 0 && managedDist.length === 0) {
        where.facility.division = session.user.division;
      }
    }

    // Filters
    if (outbreakId) {
      where.outbreakId = outbreakId;
    } else {
      // If no outbreak is specified, try to use default from settings
      const settings = await prisma.settings.findFirst();
      if (settings?.defaultOutbreakId) {
        where.outbreakId = settings.defaultOutbreakId;
      }
    }
    
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.reportingDate = { gte: startOfDay, lte: endOfDay };
    }
    
    if (from && to) {
      const startDate = new Date(from);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
      where.reportingDate = { gte: startDate, lte: endDate };
    }

    if (facilityId && session.user.role !== 'USER') {
      where.facilityId = facilityId;
    }
    
    if (division && session.user.role === 'ADMIN') {
      where.facility = { ...where.facility, division };
    }
    
    if (district) {
      where.facility = { ...where.facility, district };
    }

    const reports = await prisma.dailyReport.findMany({
      where,
      orderBy: { reportingDate: 'desc' },
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

    return NextResponse.json(reports);
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