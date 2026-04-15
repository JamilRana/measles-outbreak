import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, numerator, denominator, multiplier, unit, isActive } = await request.json();
    
    // Explicit mapping to schema field names
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (numerator !== undefined) updateData.numeratorKey = numerator;
    if (denominator !== undefined) updateData.denominatorKey = denominator;
    if (multiplier !== undefined) updateData.multiplier = multiplier;
    if (unit !== undefined) updateData.unit = unit;
    if (isActive !== undefined) updateData.isActive = isActive;

    const indicator = await prisma.indicator.update({
      where: { id },
      data: updateData
    });
    
    return NextResponse.json(indicator);
  } catch (error) {
    console.error('Indicator PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update indicator' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.indicator.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete indicator' }, { status: 500 });
  }
}
