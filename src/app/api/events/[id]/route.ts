import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeRegistrationState } from '@/lib/eventLifecycle';

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

    const now = new Date();
    const normalized = normalizeRegistrationState({
      eventRegistrationStatus: event.registrationStatus as any,
      eventRegistrationCloseTime: event.registrationCloseTime,
      closedByRole: event.closedByRole,
      date: event.date,
      time: event.time,
      now,
    });

    if (normalized) {
      const needsUpdate: Record<string, unknown> = {};
      if (event.registrationCloseTime == null) needsUpdate.registrationCloseTime = normalized.registrationCloseTime;
      if (event.registrationStatus !== normalized.registrationStatus) {
        needsUpdate.registrationStatus = normalized.registrationStatus;
        needsUpdate.closedByRole = normalized.closedByRole;
      } else if (normalized.registrationStatus === 'CLOSED' && event.closedByRole !== normalized.closedByRole) {
        needsUpdate.closedByRole = normalized.closedByRole;
      }
      if (event.eventStatus !== normalized.eventStatus) needsUpdate.eventStatus = normalized.eventStatus;

      if (Object.keys(needsUpdate).length > 0) {
        await prisma.event.update({ where: { id }, data: needsUpdate as any });
      }

      Object.assign(event, {
        registrationStatus: normalized.registrationStatus,
        registrationCloseTime: normalized.registrationCloseTime,
        closedByRole: normalized.closedByRole,
        eventStatus: normalized.eventStatus,
      });
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
