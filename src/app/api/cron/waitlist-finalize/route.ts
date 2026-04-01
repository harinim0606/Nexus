import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runWaitlistFinalizationJob } from '@/lib/waitlistFinalize';

/**
 * Call on a schedule (e.g. Vercel cron every 15m) with header:
 *   Authorization: Bearer ${CRON_SECRET}
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 });
  }
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runWaitlistFinalizationJob(prisma);
  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  return POST(request);
}
