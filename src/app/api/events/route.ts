import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { endOfLocalDay, parseEventStartEnd, rangesOverlap, startOfLocalDay } from '@/lib/schedule';

export async function GET(request: NextRequest) {
  try {
    const events = await prisma.event.findMany({
      include: { coordinator: true },
      where: { isActive: true },
    });
    return NextResponse.json(events);
  } catch (error) {
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

    const { name, description, date, time, venue, type, maxParticipants, coordinatorId } = await request.json();
    const parsedMaxParticipants =
      maxParticipants === undefined || maxParticipants === null || maxParticipants === ''
        ? null
        : typeof maxParticipants === 'string'
          ? Number(maxParticipants)
          : maxParticipants;

    const allowedCoordinatorRoles = ['EVENT_COORDINATOR', 'FACULTY_COORDINATOR'];

    // Check for clashes
    const parsedNew = parseEventStartEnd(new Date(date), time);
    if (!parsedNew) {
      return NextResponse.json(
        { error: 'Invalid time format. Expected "HH:mm - HH:mm" (24-hour).' },
        { status: 400 }
      );
    }

    const dayStart = startOfLocalDay(new Date(date));
    const dayEnd = endOfLocalDay(new Date(date));

    const existing = (await prisma.event.findMany({
      where: { isActive: true, venue, date: { gte: dayStart, lt: dayEnd } },
      select: { id: true, date: true, time: true },
    })) as Array<{ id: string; date: Date; time: string }>;

    const newStartMinutes = parsedNew.start.getHours() * 60 + parsedNew.start.getMinutes();
    const newEndMinutes = parsedNew.end.getHours() * 60 + parsedNew.end.getMinutes();

    const hasClash = existing.some((ev) => {
      const parsedExisting = parseEventStartEnd(ev.date, ev.time);
      if (!parsedExisting) return false;
      return rangesOverlap(
        newStartMinutes,
        newEndMinutes,
        parsedExisting.start.getHours() * 60 + parsedExisting.start.getMinutes(),
        parsedExisting.end.getHours() * 60 + parsedExisting.end.getMinutes()
      );
    });

    if (hasClash) {
      return NextResponse.json({ error: 'Time and venue clash' }, { status: 400 });
    }

    // Validate coordinator role (event coordinator or faculty coordinator)
    if (coordinatorId) {
      const coordinatorUser = await prisma.user.findUnique({ where: { id: coordinatorId } });
      if (!coordinatorUser || !allowedCoordinatorRoles.includes(coordinatorUser.role)) {
        return NextResponse.json({ error: 'Invalid coordinator role' }, { status: 400 });
      }
    }

    const event = await prisma.event.create({
      data: {
        name,
        description,
        date: new Date(date),
        time,
        venue,
        type,
        maxParticipants: parsedMaxParticipants,
        coordinatorId,
      },
      include: { coordinator: true },
    });
    return NextResponse.json(event);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const user = token ? verifyToken(token) : null;
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name, description, date, time, venue, type, maxParticipants, coordinatorId } = await request.json();
    const parsedMaxParticipants =
      maxParticipants === undefined || maxParticipants === null || maxParticipants === ''
        ? null
        : typeof maxParticipants === 'string'
          ? Number(maxParticipants)
          : maxParticipants;

    const parsedNew = parseEventStartEnd(new Date(date), time);
    if (!parsedNew) {
      return NextResponse.json(
        { error: 'Invalid time format. Expected "HH:mm - HH:mm" (24-hour).' },
        { status: 400 }
      );
    }

    const allowedCoordinatorRoles = ['EVENT_COORDINATOR', 'FACULTY_COORDINATOR'];
    const coordinatorUser = await prisma.user.findUnique({ where: { id: coordinatorId } });
    if (!coordinatorUser || !allowedCoordinatorRoles.includes(coordinatorUser.role)) {
      return NextResponse.json({ error: 'Invalid coordinator role' }, { status: 400 });
    }

    const dayStart = startOfLocalDay(new Date(date));
    const dayEnd = endOfLocalDay(new Date(date));

    const existing = (await prisma.event.findMany({
      where: { isActive: true, venue, date: { gte: dayStart, lt: dayEnd } },
      select: { id: true, date: true, time: true },
    })) as Array<{ id: string; date: Date; time: string }>;

    const existingWithoutSelf = existing.filter((ev) => ev.id !== id);

    const newStartMinutes = parsedNew.start.getHours() * 60 + parsedNew.start.getMinutes();
    const newEndMinutes = parsedNew.end.getHours() * 60 + parsedNew.end.getMinutes();

    const hasClash = existingWithoutSelf.some((ev) => {
      const parsedExisting = parseEventStartEnd(ev.date, ev.time);
      if (!parsedExisting) return false;
      const existingStartMinutes = parsedExisting.start.getHours() * 60 + parsedExisting.start.getMinutes();
      const existingEndMinutes = parsedExisting.end.getHours() * 60 + parsedExisting.end.getMinutes();
      return rangesOverlap(newStartMinutes, newEndMinutes, existingStartMinutes, existingEndMinutes);
    });

    if (hasClash) {
      return NextResponse.json({ error: 'Time and venue clash' }, { status: 400 });
    }

    const event = await prisma.event.update({
      where: { id },
      data: {
        name,
        description,
        date: new Date(date),
        time,
        venue,
        type,
        maxParticipants: parsedMaxParticipants,
        coordinatorId,
      },
      include: { coordinator: true },
    });

    return NextResponse.json(event);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const user = token ? verifyToken(token) : null;
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await request.json();
    await prisma.event.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}