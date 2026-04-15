import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Indicators API - Part of the Indicator Engine
 * Supports listing and creating custom health indicators.
 */
export async function GET() {
  try {
    const indicators = await prisma.indicator.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
    
    // Map internal keys back to generic names for the frontend if needed
    const mapped = indicators.map(i => ({
      ...i,
      numerator: i.numeratorKey,
      denominator: i.denominatorKey
    }));
    
    return NextResponse.json(mapped);
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

    const { name, description, numerator, denominator, multiplier, unit, isActive } = await request.json();
    
    const indicator = await prisma.indicator.create({
      data: {
        name,
        description,
        numeratorKey: numerator,
        denominatorKey: denominator,
        multiplier,
        unit,
        isActive: isActive ?? true
      }
    });
    
    return NextResponse.json(indicator);
  } catch (error) {
    console.error('Indicator POST error:', error);
    return NextResponse.json({ error: 'Failed to create indicator' }, { status: 500 });
  }
}
