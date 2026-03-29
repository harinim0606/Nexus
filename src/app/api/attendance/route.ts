import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { canManageEvent } from '@/lib/roles';

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

    const { registrationId, method, qrToken } = (await request.json()) as {
      registrationId: string;
      method: CheckInMethod;
      qrToken?: string;
    };

    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: { event: true },
    });

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    if (registration.status !== 'REGISTERED') {
      return NextResponse.json({ error: 'Only active registrations can check in' }, { status: 400 });
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

    return NextResponse.json(attendance);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

