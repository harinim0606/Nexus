import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { isParticipantRole } from '@/lib/roles';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const user = token ? verifyToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isParticipantRole(user.role)) {
      return NextResponse.json({ error: 'Only participants can submit feedback' }, { status: 403 });
    }

    const { eventId, answers } = (await request.json()) as {
      eventId?: string;
      answers?: Record<string, string>;
    };

    if (!eventId || !answers || typeof answers !== 'object') {
      return NextResponse.json({ error: 'eventId and answers required' }, { status: 400 });
    }

    const reg = await prisma.registration.findFirst({
      where: { eventId, userId: user.id, status: 'CONFIRMED' },
    });
    if (!reg) {
      return NextResponse.json({ error: 'Registration required' }, { status: 403 });
    }

    const form = await prisma.feedbackForm.findFirst({ where: { eventId } });
    if (!form) {
      return NextResponse.json({ error: 'No feedback form for this event' }, { status: 404 });
    }

    const prev = form.responses ? (JSON.parse(form.responses) as unknown[]) : [];
    const entry = {
      userId: user.id,
      submittedAt: new Date().toISOString(),
      answers,
    };
    const next = [...prev, entry];

    await prisma.feedbackForm.update({
      where: { id: form.id },
      data: { responses: JSON.stringify(next) },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
