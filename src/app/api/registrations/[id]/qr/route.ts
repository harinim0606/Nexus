import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { generateQR } from '@/lib/qr';
import { parseEventStartEnd } from '@/lib/schedule';

function canAccessRegistration(role: string) {
  return (
    role === 'ADMIN' ||
    role === 'EVENT_COORDINATOR' ||
    role === 'FACULTY_COORDINATOR' ||
    role === 'STUDENT_COORDINATOR'
  );
}

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

    const { id } = await context.params;
    const registration = await prisma.registration.findUnique({
      where: { id },
      include: { event: true },
    });

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    if (registration.status !== 'REGISTERED') {
      return NextResponse.json({ error: 'QR only available for confirmed registrations' }, { status: 400 });
    }

    const isOwner = registration.userId === user.id;
    if (!isOwner && !canAccessRegistration(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const eventRange = parseEventStartEnd(registration.event.date, registration.event.time);
    if (!eventRange) {
      return NextResponse.json({ error: 'Invalid event schedule format' }, { status: 400 });
    }

    const now = new Date();
    const startMs = eventRange.start.getTime();
    const endMs = eventRange.end.getTime();
    const opensAt = startMs - 10 * 60 * 1000;
    const closesAt = endMs + 4 * 60 * 60 * 1000;

    if (now.getTime() < opensAt) {
      return NextResponse.json(
        {
          error: 'QR unlocks 10 minutes before the event start',
          availableInMs: opensAt - now.getTime(),
        },
        { status: 400 }
      );
    }

    if (now.getTime() > closesAt) {
      return NextResponse.json({ error: 'Check-in window for this event has closed' }, { status: 400 });
    }

    let tokenValue = registration.qrCode;
    if (!tokenValue) {
      tokenValue = `nexus:${registration.id}:${eventRange.start.getTime()}`;
      await prisma.registration.update({
        where: { id: registration.id },
        data: { qrCode: tokenValue },
      });
    }

    const qrDataUrl = await generateQR(tokenValue);
    return NextResponse.json({ registrationId: registration.id, qrDataUrl, token: tokenValue });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
