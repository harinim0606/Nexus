import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import {
  collectEmailsFromPayload,
  parseParticipantPayload,
  rosterEmailsForDb,
  type ParticipantPayload,
} from '@/lib/participantPayload';
import { sendRegistrationConfirmedEmail, sendWaitlistEmail } from '@/lib/email';
import { isCoordinatorRole, isParticipantRole } from '@/lib/roles';
import { persistQrAndGetDataUrl } from '@/lib/registrationQr';
import { CONFIRMED, WAITLISTED } from '@/lib/registrationStatus';
import type { Prisma } from '@prisma/client';
import { normalizeRegistrationState } from '@/lib/eventLifecycle';

function eventMail(
  event: { name: string; date: Date; time: string; venue: string }
): { name: string; date: Date; time: string; venue: string } {
  return { name: event.name, date: event.date, time: event.time, venue: event.venue };
}

function emailsFromStoredRegistration(r: {
  user: { email: string };
  memberEmails: string | null;
  participantDetails: string | null;
  leaderEmail: string | null;
  teamMembers: string | null;
}): Set<string> {
  const s = new Set<string>([r.user.email.toLowerCase()]);
  if (r.leaderEmail?.trim()) s.add(r.leaderEmail.trim().toLowerCase());
  let roster: unknown = null;
  if (typeof r.teamMembers === 'string' && r.teamMembers.trim()) {
    try {
      roster = JSON.parse(r.teamMembers) as unknown;
    } catch {
      roster = null;
    }
  }
  if (Array.isArray(roster)) {
    for (const m of roster) {
      if (m && typeof m === 'object' && 'email' in m && typeof (m as { email: unknown }).email === 'string') {
        s.add((m as { email: string }).email.trim().toLowerCase());
      }
    }
  }
  if (r.memberEmails) {
    try {
      const parsed = JSON.parse(r.memberEmails) as unknown;
      if (Array.isArray(parsed)) {
        parsed.forEach((e) => {
          if (typeof e === 'string') s.add(e.trim().toLowerCase());
        });
      }
    } catch {
      /* ignore */
    }
  }
  if (r.participantDetails) {
    try {
      const p = JSON.parse(r.participantDetails) as ParticipantPayload;
      collectEmailsFromPayload(p).forEach((e) => s.add(e));
    } catch {
      /* ignore */
    }
  }
  return s;
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const user = token ? verifyToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isParticipantRole(user.role)) {
      return NextResponse.json({ error: 'Only participants can register' }, { status: 403 });
    }

    const body = (await request.json()) as {
      eventId: string;
      participantDetails?: unknown;
    };

    const { eventId, participantDetails: detailsRaw } = body;

    const existing = await prisma.registration.findFirst({
      where: { eventId, userId: user.id, status: { in: [CONFIRMED, WAITLISTED] } },
    });
    if (existing) {
      return NextResponse.json({ error: 'Already registered' }, { status: 400 });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
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

    if (!normalized) {
      return NextResponse.json({ error: 'Invalid event schedule' }, { status: 400 });
    }

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
      await prisma.event.update({ where: { id: event.id }, data: needsUpdate as any });
      Object.assign(event, needsUpdate);
    }

    // Block registration if registration is closed OR the event has started.
    if (normalized.registrationStatus === 'CLOSED' || now >= normalized.start) {
      return NextResponse.json({ error: 'Registration is closed for this event.' }, { status: 400 });
    }

    const parseOpts =
      event.type === 'TEAM' ? { maxParticipants: event.maxParticipants } : undefined;
    const parsed = parseParticipantPayload(
      detailsRaw,
      event.type as 'INDIVIDUAL' | 'TEAM',
      user.email,
      parseOpts
    );
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const payload = parsed.payload;

    const registrationsCount = await prisma.registration.count({
      where: { eventId, status: CONFIRMED },
    });

    let status: typeof CONFIRMED | typeof WAITLISTED = CONFIRMED;
    if (event.maxParticipants && registrationsCount >= event.maxParticipants) {
      status = WAITLISTED;
    }

    const newEmails = collectEmailsFromPayload(payload);

    const peerRegs = await prisma.registration.findMany({
      where: {
        eventId,
        status: { in: [CONFIRMED, WAITLISTED] },
      },
      include: { user: true },
    });

    for (const r of peerRegs) {
      if (r.userId === user.id) continue;
      const emails = emailsFromStoredRegistration(r);
      for (const e of newEmails) {
        if (e && emails.has(e.toLowerCase())) {
          return NextResponse.json(
            { error: 'A participant with this email is already registered for this event' },
            { status: 400 }
          );
        }
      }
    }

    const waitCount = await prisma.registration.count({ where: { eventId, status: WAITLISTED } });

    const registration = await prisma.registration.create({
      data: {
        eventId,
        userId: user.id,
        participantDetails: JSON.stringify(payload),
        status,
        waitlistPosition: status === WAITLISTED ? waitCount + 1 : null,
        qrEmailSentAt: null,
        ...(payload.kind === 'team'
          ? {
              teamName: payload.teamName,
              teamCollegeName: payload.teamCollegeName,
              teamDepartment: payload.teamDepartment,
              leaderName: payload.leaderName,
              leaderEmail: payload.leaderEmail,
              leaderPhone: payload.leaderPhone,
              teamMembers: JSON.stringify(payload.members),
              memberEmails: JSON.stringify(rosterEmailsForDb(payload)),
            }
          : {
              teamName: null,
              teamCollegeName: null,
              teamDepartment: null,
              leaderName: null,
              leaderEmail: null,
              leaderPhone: null,
              memberEmails: null,
            }),
      },
    });

    const evMail = eventMail(event);
    if (status === CONFIRMED) {
      await persistQrAndGetDataUrl(prisma, registration.id, event);
      await sendRegistrationConfirmedEmail(user.email, evMail);
    } else {
      await sendWaitlistEmail(user.email, evMail);
    }

    return NextResponse.json(registration);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const user = token ? verifyToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    const baseWhere: Prisma.RegistrationWhereInput = eventId ? { eventId } : {};

    let where: Prisma.RegistrationWhereInput = {
      ...baseWhere,
      status: { not: 'CANCELLED' },
    };

    if (isParticipantRole(user.role)) {
      where = { ...where, userId: user.id };
    } else if (isCoordinatorRole(user.role) && user.role !== 'ADMIN') {
      const assignedEvents = await prisma.event.findMany({
        where: {
          isActive: true,
          OR: [{ coordinatorId: user.id }, { studentCoordinatorId: user.id }],
        },
        select: { id: true },
      });
      const assignedIds = assignedEvents.map((e) => e.id);

      if (eventId) {
        where = assignedIds.includes(eventId)
          ? { ...where }
          : { ...where, eventId: { in: [] } };
      } else {
        where = { ...where, eventId: { in: assignedIds } };
      }
    }

    const registrations = await prisma.registration.findMany({
      where,
      include: { event: true, user: true, attendance: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(registrations);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
