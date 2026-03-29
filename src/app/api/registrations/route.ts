import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { sendRegistrationConfirmationWithStatus } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const user = token ? verifyToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId, teamMembers } = (await request.json()) as {
      eventId: string;
      teamMembers?: unknown;
    };

    // Check if already registered
    const existing = await prisma.registration.findFirst({
      where: { eventId, userId: user.id },
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

    const registration = await prisma.registration.create({
      data: {
        eventId,
        userId: user.id,
        teamMembers: parsedTeamMemberNames ? JSON.stringify(parsedTeamMemberNames) : null,
        status,
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

    const baseWhere = eventId ? { eventId } : {};

    // Role-based access:
    // - ADMIN/Coordinators: can view all (optionally filtered by eventId)
    // - STUDENT_COORDINATOR: only assigned events
    // - STUDENT: only their own registrations
    let where: any = baseWhere;
    if (user.role === 'STUDENT') {
      where = { ...baseWhere, userId: user.id };
    } else if (user.role === 'STUDENT_COORDINATOR') {
      const assignedEvents = (await prisma.event.findMany({
        where: { coordinatorId: user.id, isActive: true },
        select: { id: true },
      })) as Array<{ id: string }>;
      const assignedIds = assignedEvents.map((e) => e.id);

      if (eventId) {
        where = assignedIds.includes(eventId)
          ? { ...baseWhere }
          : { ...baseWhere, eventId: { in: [] } };
      } else {
        where = { ...baseWhere, eventId: { in: assignedIds } };
      }
    }

    const registrations = await prisma.registration.findMany({
      where,
      include: { event: true, user: true },
    });
    return NextResponse.json(registrations);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}