import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { canManageEvent, isParticipantRole } from '@/lib/roles';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const user = token ? verifyToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = new URL(request.url).searchParams.get('eventId');

    if (isParticipantRole(user.role)) {
      const rows = await prisma.certificate.findMany({
        where: { userId: user.id },
        include: { event: true },
        orderBy: { issuedAt: 'desc' },
      });
      return NextResponse.json(rows);
    }

    if (user.role === 'ADMIN') {
      const rows = await prisma.certificate.findMany({
        where: eventId ? { eventId } : {},
        include: { user: { select: { id: true, name: true, email: true } }, event: true },
        orderBy: { issuedAt: 'desc' },
      });
      return NextResponse.json(rows);
    }

    if (!eventId) {
      return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (!canManageEvent(user.role, event.coordinatorId, event.studentCoordinatorId, user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rows = await prisma.certificate.findMany({
      where: { eventId },
      include: { user: { select: { id: true, name: true, email: true } }, event: true },
      orderBy: { issuedAt: 'desc' },
    });
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
