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

    const reportsToday = await prisma.dailyReport.count({
      where: {
        reportingDate: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    const submittedToday = await prisma.dailyReport.groupBy({
      by: ['userId'],
      where: {
        reportingDate: {
          gte: today,
          lt: tomorrow
        }
      },
      _count: true
    });

    return NextResponse.json({
      totalUsers,
      activeToday: submittedToday.length,
      reportsToday,
      submissionRate: totalUsers > 0 ? Math.round((submittedToday.length / totalUsers) * 100) : 0
    });
  } catch (error) {
    console.error('User stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}