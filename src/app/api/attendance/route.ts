import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { canManageEvent } from '@/lib/roles';
import { CONFIRMED } from '@/lib/registrationStatus';
import { issueCertificateAfterAttendance } from '@/lib/issueAttendanceCertificate';

type CheckInMethod = 'QR' | 'MANUAL';

function canManualCheckIn(role: string) {
  return role === 'ADMIN' || role === 'EVENT_COORDINATOR' || role === 'FACULTY_COORDINATOR' || role === 'STUDENT_COORDINATOR';
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const user = token ? verifyToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { registrationId, method, qrToken, eventId: expectedEventId } = (await request.json()) as {
      registrationId: string;
      method: CheckInMethod;
      qrToken?: string;
      /** When scanning, must match the event you are checking in for */
      eventId?: string;
    };

    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: { event: true },
    });

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    if (
      method === 'QR' &&
      typeof expectedEventId === 'string' &&
      expectedEventId &&
      registration.eventId !== expectedEventId
    ) {
      return NextResponse.json({ error: 'This pass is for a different event' }, { status: 400 });
    }

    if (registration.status !== CONFIRMED) {
      return NextResponse.json({ error: 'Only confirmed registrations can check in' }, { status: 400 });
    }

    if (method === 'MANUAL') {
      if (!canManualCheckIn(user.role)) {
        return NextResponse.json({ error: 'Only coordinators/admin can do manual check-in' }, { status: 403 });
      }
      if (
        !canManageEvent(
          user.role,
          registration.event.coordinatorId,
          registration.event.studentCoordinatorId,
          user.id
        )
      ) {
        return NextResponse.json({ error: 'Forbidden for this event' }, { status: 403 });
      }
    }

    if (method === 'QR') {
      if (!canManualCheckIn(user.role)) {
        return NextResponse.json({ error: 'Only coordinators can scan QR codes' }, { status: 403 });
      }
      if (
        !canManageEvent(
          user.role,
          registration.event.coordinatorId,
          registration.event.studentCoordinatorId,
          user.id
        )
      ) {
        return NextResponse.json({ error: 'Forbidden for this event' }, { status: 403 });
      }
      if (!qrToken || registration.qrCode !== qrToken) {
        return NextResponse.json({ error: 'Invalid QR token' }, { status: 400 });
      }
    }

    const existing = await prisma.attendance.findUnique({
      where: { registrationId },
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    const attendance = await prisma.attendance.create({
      data: { registrationId },
    });

    try {
      await issueCertificateAfterAttendance(prisma, registrationId);
    } catch (e) {
      console.error('Certificate email failed', e);
    }

    return NextResponse.json(attendance);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

