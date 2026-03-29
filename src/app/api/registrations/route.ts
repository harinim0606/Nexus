import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { sendRegistrationConfirmationWithStatus } from '@/lib/email';
import { isCoordinatorRole, isParticipantRole } from '@/lib/roles';
import type { Prisma } from '@prisma/client';

function parseEmailList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => (typeof x === 'string' ? x.trim().toLowerCase() : ''))
    .filter(Boolean);
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
      teamMembers?: unknown;
      memberEmails?: unknown;
      teamName?: unknown;
    };

    const { eventId, teamMembers, memberEmails: memberEmailsRaw, teamName: teamNameRaw } = body;

    const existing = await prisma.registration.findFirst({
      where: { eventId, userId: user.id, status: { in: ['REGISTERED', 'WAITLIST'] } },
    });
    if (existing) {
      return NextResponse.json({ error: 'Already registered' }, { status: 400 });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const registrationsCount = await prisma.registration.count({
      where: { eventId, status: 'REGISTERED' },
    });

    let status: 'REGISTERED' | 'WAITLIST' = 'REGISTERED';
    if (event.maxParticipants && registrationsCount >= event.maxParticipants) {
      status = 'WAITLIST';
    }

    const memberEmailList = parseEmailList(memberEmailsRaw);
    const teamName =
      event.type === 'TEAM' && typeof teamNameRaw === 'string' && teamNameRaw.trim()
        ? teamNameRaw.trim()
        : null;

    const parsedTeamMemberNames =
      event.type === 'TEAM' && Array.isArray(teamMembers)
        ? teamMembers
            .map((m) => {
              if (typeof m === 'string') return m;
              if (typeof m === 'object' && m !== null && 'name' in m) {
                const maybeName = (m as { name?: unknown }).name;
                return typeof maybeName === 'string' ? maybeName : undefined;
              }
              return undefined;
            })
            .filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
        : null;

    if (event.type === 'TEAM' && (!teamName || !parsedTeamMemberNames?.length)) {
      return NextResponse.json(
        { error: 'Team name and at least one member name are required' },
        { status: 400 }
      );
    }

    const leaderEmail = user.email.toLowerCase();
    const allEmails = new Set([leaderEmail, ...memberEmailList]);

    const peerRegs = await prisma.registration.findMany({
      where: {
        eventId,
        status: { in: ['REGISTERED', 'WAITLIST'] },
      },
      include: { user: true },
    });

    for (const r of peerRegs) {
      if (r.userId === user.id) continue;
      const emails = new Set<string>([r.user.email.toLowerCase()]);
      if (r.memberEmails) {
        try {
          const parsed = JSON.parse(r.memberEmails) as unknown;
          if (Array.isArray(parsed)) {
            parsed.forEach((e) => {
              if (typeof e === 'string') emails.add(e.toLowerCase());
            });
          }
        } catch {
          /* ignore */
        }
      }
      for (const e of allEmails) {
        if (emails.has(e)) {
          return NextResponse.json(
            { error: 'A team member is already registered for this event' },
            { status: 400 }
          );
        }
      }
    }

    const waitCount = await prisma.registration.count({ where: { eventId, status: 'WAITLIST' } });

    const registration = await prisma.registration.create({
      data: {
        eventId,
        userId: user.id,
        teamName,
        teamMembers: parsedTeamMemberNames ? JSON.stringify(parsedTeamMemberNames) : null,
        memberEmails: memberEmailList.length ? JSON.stringify(memberEmailList) : null,
        status,
        waitlistPosition: status === 'WAITLIST' ? waitCount + 1 : null,
      },
    });

    await sendRegistrationConfirmationWithStatus(user.email, event.name, status);

    return NextResponse.json(registration);
  } catch (error) {
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
