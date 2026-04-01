import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { canManageEvent, isParticipantRole } from '@/lib/roles';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;
    const user = token ? verifyToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: eventId } = await context.params;
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        coordinatorId: true,
        studentCoordinatorId: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const isManager = canManageEvent(user.role, event.coordinatorId, event.studentCoordinatorId, user.id);
    let isParticipantViewer = false;
    if (!isManager && isParticipantRole(user.role)) {
      const reg = await prisma.registration.findFirst({
        where: {
          eventId,
          userId: user.id,
          status: { in: ['CONFIRMED', 'WAITLISTED'] },
        },
        select: { id: true },
      });
      isParticipantViewer = !!reg;
    }

    if (!isManager && !isParticipantViewer) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [registered, waitlist, checkedIn] = await Promise.all([
      prisma.registration.count({ where: { eventId, status: 'CONFIRMED' } }),
      prisma.registration.count({ where: { eventId, status: 'WAITLISTED' } }),
      prisma.attendance.count({
        where: { registration: { eventId, status: 'CONFIRMED' } },
      }),
    ]);

    const capacity = (await prisma.event.findUnique({ where: { id: eventId }, select: { maxParticipants: true } }))
      ?.maxParticipants;

    const seatsRemaining =
      capacity == null ? null : Math.max(0, capacity - registered);

    return NextResponse.json({
      eventId,
      registered,
      waitlist,
      checkedIn,
      seatsRemaining,
      capacity,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
