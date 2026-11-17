import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { invalidateByPattern } from '@/lib/redis';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role || "";
    
    if (role !== 'ADMIN' && role !== 'EDITOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Clear all summary and geo patterns
    await Promise.all([
      invalidateByPattern('summary:*'),
      invalidateByPattern('geo:*'),
      invalidateByPattern('timeseries:*')
    ]);

    return NextResponse.json({ success: true, message: 'Redis cache synchronized with database' });
  } catch (error: any) {
    console.error('[Sync API Error]', error);
    return NextResponse.json({ error: 'Sync failed', details: error.message }, { status: 500 });
  }
}
