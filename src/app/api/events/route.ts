import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { isCoordinatorRole } from '@/lib/roles';
import { endOfLocalDay, parseEventStartEnd, rangesOverlap, startOfLocalDay } from '@/lib/schedule';
import { assertCoordinatorScheduleOverlap } from '@/lib/eventCoordinatorOverlap';
import { fillSeatsFromWaitlist } from '@/lib/waitlist';

const FACULTY_COORD_ROLES = ['EVENT_COORDINATOR', 'FACULTY_COORDINATOR'] as const;

async function assertFacultyCoordinator(id: string | undefined | null) {
  if (!id) return null;
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u || !FACULTY_COORD_ROLES.includes(u.role as (typeof FACULTY_COORD_ROLES)[number])) {
    return false;
  }
  return true;
}

async function assertStudentCoordinator(id: string | null | undefined) {
  if (!id) return true;
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u || u.role !== 'STUDENT_COORDINATOR') {
    return false;
  }
  return true;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const q = searchParams.get('q')?.trim().toLowerCase();
    const mine = searchParams.get('mine') === '1';
    const adminAll = searchParams.get('admin') === '1';

    const token = request.cookies.get('token')?.value;
    const user = token ? verifyToken(token) : null;

    if (adminAll && user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const assignedOnly =
      mine &&
      user &&
      isCoordinatorRole(user.role) &&
      user.role !== 'ADMIN';

    const events = await prisma.event.findMany({
      include: { coordinator: true, studentCoordinator: true },
      where: {
        ...(user?.role === 'ADMIN' && adminAll ? {} : { isActive: true }),
        ...(assignedOnly
          ? {
              OR: [{ coordinatorId: user!.id }, { studentCoordinatorId: user!.id }],
            }
          : {}),
        ...(category && category !== 'all' ? { category } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { description: { contains: q } },
                { venue: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { date: 'asc' },
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

    const body = await request.json();
    const {
      name,
      description,
      date,
      time,
      venue,
      type,
      maxParticipants,
      coordinatorId,
      studentCoordinatorId,
      posterUrl,
      rules,
      onlineLink,
      category,
    } = body;

    const parsedMaxParticipants =
      maxParticipants === undefined || maxParticipants === null || maxParticipants === ''
        ? null
        : typeof maxParticipants === 'string'
          ? Number(maxParticipants)
          : maxParticipants;

    if ((await assertFacultyCoordinator(coordinatorId)) !== true) {
      return NextResponse.json({ error: 'Invalid faculty coordinator' }, { status: 400 });
    }
    if ((await assertStudentCoordinator(studentCoordinatorId ?? null)) !== true) {
      return NextResponse.json({ error: 'Invalid student coordinator' }, { status: 400 });
    }

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

    const coordOverlap = await assertCoordinatorScheduleOverlap({
      date: new Date(date),
      time,
      facultyCoordinatorId: coordinatorId,
      studentCoordinatorId: studentCoordinatorId || null,
    });
    if (coordOverlap) {
      return NextResponse.json({ error: coordOverlap }, { status: 400 });
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
        studentCoordinatorId: studentCoordinatorId || null,
        posterUrl: posterUrl || null,
        rules: rules || null,
        onlineLink: onlineLink || null,
        category: typeof category === 'string' && category.trim() ? category.trim() : 'General',
      },
      include: { coordinator: true, studentCoordinator: true },
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

    const body = await request.json();
    const {
      id,
      name,
      description,
      date,
      time,
      venue,
      type,
      maxParticipants,
      coordinatorId,
      studentCoordinatorId,
      posterUrl,
      rules,
      onlineLink,
      category,
    } = body;

    const parsedMaxParticipants =
      maxParticipants === undefined || maxParticipants === null || maxParticipants === ''
        ? null
        : typeof maxParticipants === 'string'
          ? Number(maxParticipants)
          : maxParticipants;

    if ((await assertFacultyCoordinator(coordinatorId)) !== true) {
      return NextResponse.json({ error: 'Invalid faculty coordinator' }, { status: 400 });
    }
    if ((await assertStudentCoordinator(studentCoordinatorId ?? null)) !== true) {
      return NextResponse.json({ error: 'Invalid student coordinator' }, { status: 400 });
    }

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

    const coordOverlap = await assertCoordinatorScheduleOverlap({
      excludeEventId: id,
      date: new Date(date),
      time,
      facultyCoordinatorId: coordinatorId,
      studentCoordinatorId: studentCoordinatorId || null,
    });
    if (coordOverlap) {
      return NextResponse.json({ error: coordOverlap }, { status: 400 });
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
        studentCoordinatorId: studentCoordinatorId || null,
        posterUrl: posterUrl === undefined ? undefined : posterUrl || null,
        rules: rules === undefined ? undefined : rules || null,
        onlineLink: onlineLink === undefined ? undefined : onlineLink || null,
        category:
          category === undefined
            ? undefined
            : typeof category === 'string' && category.trim()
              ? category.trim()
              : 'General',
      },
      include: { coordinator: true, studentCoordinator: true },
    });

    if (parsedMaxParticipants != null) {
      await fillSeatsFromWaitlist(prisma, id);
    }

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
    await prisma.event.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ ok: true, archived: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
