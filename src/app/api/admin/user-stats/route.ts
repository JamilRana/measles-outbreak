import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const totalUsers = await prisma.user.count({
      where: { role: { not: 'VIEWER' }, isActive: true }
    });

    const [legacyReportsToday, modernReportsToday, legacySubmits, modernSubmits] = await Promise.all([
      prisma.dailyReport.count({
        where: { reportingDate: { gte: today, lt: tomorrow } }
      }),
      prisma.report.count({
        where: { periodStart: { gte: today, lt: tomorrow } }
      }),
      prisma.dailyReport.findMany({
        where: { reportingDate: { gte: today, lt: tomorrow } },
        select: { userId: true }
      }),
      prisma.report.findMany({
        where: { periodStart: { gte: today, lt: tomorrow } },
        select: { userId: true }
      })
    ]);

    const activeUserSet = new Set([
      ...legacySubmits.map(s => s.userId),
      ...modernSubmits.map(s => s.userId)
    ]);

    return NextResponse.json({
      totalUsers,
      activeToday: activeUserSet.size,
      reportsToday: legacyReportsToday + modernReportsToday,
      submissionRate: totalUsers > 0 ? Math.round((activeUserSet.size / totalUsers) * 100) : 0
    });
  } catch (error) {
    console.error('User stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}