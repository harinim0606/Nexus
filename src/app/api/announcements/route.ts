import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { isCoordinatorRole, isParticipantRole } from '@/lib/roles';
import { sendAnnouncementEmail } from '@/lib/email';

const AUDIENCES = ['ALL_USERS', 'EVENT_PARTICIPANTS', 'EVENT_WAITLIST'] as const;

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const user = token ? verifyToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const announcements = await prisma.announcement.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100,
      include: { event: { select: { id: true, name: true } } },
    });

    if (user.role === 'ADMIN') {
      return NextResponse.json(announcements);
    }

    const regs = await prisma.registration.findMany({
      where: { userId: user.id, status: { not: 'CANCELLED' } },
      select: { eventId: true, status: true },
    });
    const byEvent = new Map(regs.map((r) => [r.eventId, r.status]));

    const visible = announcements.filter((a) => {
      if (a.audience === 'ALL_USERS') return true;
      if (!a.eventId) return false;
      const st = byEvent.get(a.eventId);
      if (!st) return false;
      if (a.audience === 'EVENT_PARTICIPANTS') return st === 'CONFIRMED';
      if (a.audience === 'EVENT_WAITLIST') return st === 'WAITLISTED';
      return false;
    });

    if (isParticipantRole(user.role)) {
      return NextResponse.json(visible);
    }

    if (!isCoordinatorRole(user.role)) {
      return NextResponse.json([]);
    }

    const assigned = await prisma.event.findMany({
      where: {
        isActive: true,
        OR: [{ coordinatorId: user.id }, { studentCoordinatorId: user.id }],
      },
      select: { id: true },
    });
    const ids = new Set(assigned.map((e) => e.id));

    return NextResponse.json(
      announcements.filter((a) => a.audience === 'ALL_USERS' || (a.eventId && ids.has(a.eventId)))
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const user = token ? verifyToken(token) : null;
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as {
      message?: string;
      subject?: string;
      audience?: string;
      eventId?: string | null;
    };

    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ error: 'message required' }, { status: 400 });
    }

    const audience = (body.audience || 'ALL_USERS') as (typeof AUDIENCES)[number];
    if (!AUDIENCES.includes(audience)) {
      return NextResponse.json({ error: 'Invalid audience' }, { status: 400 });
    }

    if (audience !== 'ALL_USERS' && !body.eventId) {
      return NextResponse.json({ error: 'eventId required for targeted audience' }, { status: 400 });
    }

    const ann = await prisma.announcement.create({
      data: {
        message,
        subject: body.subject?.trim() || null,
        audience,
        eventId: audience === 'ALL_USERS' ? null : (body.eventId as string),
      },
    });

    let recipients: { id: string; email: string }[] = [];
    if (audience === 'ALL_USERS') {
      recipients = await prisma.user.findMany({ select: { id: true, email: true } });
    } else if (audience === 'EVENT_PARTICIPANTS' && body.eventId) {
      const rows = await prisma.registration.findMany({
        where: { eventId: body.eventId, status: 'CONFIRMED' },
        include: { user: { select: { id: true, email: true } } },
      });
      recipients = rows.map((r) => ({ id: r.userId, email: r.user.email }));
    } else if (audience === 'EVENT_WAITLIST' && body.eventId) {
      const rows = await prisma.registration.findMany({
        where: { eventId: body.eventId, status: 'WAITLISTED' },
        include: { user: { select: { id: true, email: true } } },
      });
      recipients = rows.map((r) => ({ id: r.userId, email: r.user.email }));
    }

    const unique = [...new Map(recipients.map((r) => [r.id, r])).values()];

    if (unique.length > 0) {
      await prisma.$transaction(
        unique.map((r) =>
          prisma.notification.create({
            data: {
              userId: r.id,
              title: body.subject?.trim() || 'NEXUS announcement',
              body: message,
            },
          })
        )
      );
    }

    const subj = body.subject?.trim() || 'NEXUS announcement';
    await Promise.all(unique.map((r) => sendAnnouncementEmail(r.email, subj, message)));

    return NextResponse.json(ann);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
