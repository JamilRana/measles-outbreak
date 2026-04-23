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

    const [reportsTodayCount, submittedUsers] = await Promise.all([
      prisma.report.count({
        where: { periodStart: { gte: today, lt: tomorrow } }
      }),
      prisma.report.findMany({
        where: { periodStart: { gte: today, lt: tomorrow } },
        select: { userId: true }
      })
    ]);

    const activeUserSet = new Set(submittedUsers.map(s => s.userId));

    return NextResponse.json({
      totalUsers,
      activeToday: activeUserSet.size,
      reportsToday: reportsTodayCount,
      submissionRate: totalUsers > 0 ? Math.round((activeUserSet.size / totalUsers) * 100) : 0
    });
  } catch (error) {
    console.error('User stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}