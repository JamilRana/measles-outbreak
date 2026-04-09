import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const divisions = await prisma.facility.findMany({
      select: { division: true },
      distinct: ['division'],
      orderBy: { division: 'asc' },
      where: { isActive: true },
    });

    return NextResponse.json(divisions.map(d => d.division));
  } catch (error) {
    console.error('Filters error:', error);
    return NextResponse.json({ error: 'Failed to fetch filters' }, { status: 500 });
  }
}