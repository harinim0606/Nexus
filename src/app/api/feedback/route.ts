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
    if (!eventId) {
      return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const allowed =
      canManageEvent(user.role, event.coordinatorId, event.studentCoordinatorId, user.id) ||
      (isParticipantRole(user.role) &&
        !!(await prisma.registration.findFirst({
          where: { eventId, userId: user.id, status: { in: ['CONFIRMED', 'WAITLISTED'] } },
        })));

    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const form = await prisma.feedbackForm.findFirst({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(form);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const user = token ? verifyToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId, questions } = (await request.json()) as {
      eventId?: string;
      questions?: unknown;
    };

    if (!eventId || !Array.isArray(questions)) {
      return NextResponse.json({ error: 'eventId and questions[] required' }, { status: 400 });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (!canManageEvent(user.role, event.coordinatorId, event.studentCoordinatorId, user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.feedbackForm.findFirst({ where: { eventId } });
    const payload = JSON.stringify(questions);

    const form = existing
      ? await prisma.feedbackForm.update({
          where: { id: existing.id },
          data: { questions: payload },
        })
      : await prisma.feedbackForm.create({
          data: { eventId, questions: payload },
        });

    return NextResponse.json(form);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
