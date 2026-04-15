import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    let settings = await prisma.settings.findFirst();
    
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          enablePublicView: true,
          enableEmailNotifications: true,
        }
      });
    }
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const existing = await prisma.settings.findFirst();
    
    let settings;
    if (existing) {
      settings = await prisma.settings.update({
        where: { id: existing.id },
        data: body
      });
    } else {
      settings = await prisma.settings.create({
        data: body
      });
    }
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Settings POST error:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
