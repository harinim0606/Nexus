import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { generateQR } from '@/lib/qr';
import { parseEventStartEnd } from '@/lib/schedule';

function canAccessRegistration(role: string) {
  return role === 'ADMIN' || role === 'EVENT_COORDINATOR' || role === 'FACULTY_COORDINATOR' || role === 'STUDENT_COORDINATOR';
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

    const isOwner = registration.userId === user.id;
    if (!isOwner && !canAccessRegistration(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const eventRange = parseEventStartEnd(registration.event.date, registration.event.time);
    if (!eventRange) {
      return NextResponse.json({ error: 'Invalid event schedule format' }, { status: 400 });
    }

    const now = new Date();
    const diffMs = eventRange.start.getTime() - now.getTime();
    const inWindow = diffMs <= 10 * 60 * 1000 && diffMs >= 5 * 60 * 1000;

    let tokenValue = registration.qrCode;
    if (!tokenValue) {
      if (!inWindow) {
        return NextResponse.json(
          {
            error: 'QR generation window is only 5-10 minutes before event start',
            availableInMs: diffMs - 10 * 60 * 1000,
          },
          { status: 400 }
        );
      }

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

