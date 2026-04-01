import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const event = await prisma.event.findFirst({
      where: { id, isActive: true },
      include: {
        coordinator: true,
        studentCoordinator: true,
      },
    });
    if (!event) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const [registered, waitlist, checkedIn] = await Promise.all([
      prisma.registration.count({ where: { eventId: id, status: 'CONFIRMED' } }),
      prisma.registration.count({ where: { eventId: id, status: 'WAITLISTED' } }),
      prisma.attendance.count({
        where: { registration: { eventId: id, status: 'CONFIRMED' } },
      }),
    ]);

    const capacity = event.maxParticipants ?? null;
    const seatsRemaining =
      capacity === null ? null : Math.max(0, capacity - registered);

    return NextResponse.json({
      ...event,
      stats: { registered, waitlist, checkedIn, seatsRemaining, capacity },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
