import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createAuditLog, AuditActions } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const userId = searchParams.get('userId');
    const division = searchParams.get('division');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: any = {};
    
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

    if (userId) where.userId = userId;
    
    // Filter by user's division if provided
    if (division) {
      where.user = { division };
    }

    const reports = await prisma.dailyReport.findMany({
      where,
      orderBy: { reportingDate: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            facilityName: true,
            division: true,
            district: true
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
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reportingDate, suspected24h, confirmed24h, suspectedDeath24h, confirmedDeath24h, admitted24h, discharged24h, serumSent24h } = body;

    const reportDate = new Date(reportingDate);
    const startOfDay = new Date(reportDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await prisma.dailyReport.findFirst({
      where: {
        userId: session.user.id,
        reportingDate: { gte: startOfDay, lte: endOfDay }
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'You have already submitted a report for this date' }, { status: 400 });
    }

    const report = await prisma.dailyReport.create({
      data: {
        reportingDate: reportDate,
        userId: session.user.id,
        suspected24h: Number(suspected24h) || 0,
        confirmed24h: Number(confirmed24h) || 0,
        suspectedDeath24h: Number(suspectedDeath24h) || 0,
        confirmedDeath24h: Number(confirmedDeath24h) || 0,
        admitted24h: Number(admitted24h) || 0,
        discharged24h: Number(discharged24h) || 0,
        serumSent24h: Number(serumSent24h) || 0,
      }
    });

    await createAuditLog({
      userId: session.user.id,
      action: AuditActions.REPORT_CREATE,
      entityType: 'DailyReport',
      entityId: report.id,
      details: { reportingDate, suspected24h, confirmed24h },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error('Report POST error:', error);
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }
}