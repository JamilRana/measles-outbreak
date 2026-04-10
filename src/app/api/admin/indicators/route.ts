import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const indicators = await prisma.indicator.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(indicators);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch indicators' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const indicator = await prisma.indicator.create({
      data: body
    });
    return NextResponse.json(indicator);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create indicator' }, { status: 500 });
  }
}
