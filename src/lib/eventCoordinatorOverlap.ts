import { prisma } from '@/lib/prisma';
import { endOfLocalDay, parseEventStartEnd, rangesOverlap, startOfLocalDay } from '@/lib/schedule';

/**
 * Ensures the same person (faculty or student coordinator) is not assigned to two
 * overlapping events on the same calendar day (any venue).
 */
export async function assertCoordinatorScheduleOverlap(params: {
  excludeEventId?: string;
  date: Date;
  time: string;
  facultyCoordinatorId: string;
  studentCoordinatorId: string | null;
}): Promise<string | null> {
  const parsedNew = parseEventStartEnd(params.date, params.time);
  if (!parsedNew) return 'Invalid time format.';

  const newStart =
    parsedNew.start.getHours() * 60 + parsedNew.start.getMinutes();
  const newEnd = parsedNew.end.getHours() * 60 + parsedNew.end.getMinutes();

  const dayStart = startOfLocalDay(new Date(params.date));
  const dayEnd = endOfLocalDay(new Date(params.date));

  const people = new Set<string>(
    [params.facultyCoordinatorId, params.studentCoordinatorId ?? ''].filter(Boolean)
  );

  const others = await prisma.event.findMany({
    where: {
      isActive: true,
      date: { gte: dayStart, lt: dayEnd },
      ...(params.excludeEventId ? { id: { not: params.excludeEventId } } : {}),
    },
    select: {
      id: true,
      date: true,
      time: true,
      coordinatorId: true,
      studentCoordinatorId: true,
    },
  });

  for (const ev of others) {
    const parsedExisting = parseEventStartEnd(ev.date, ev.time);
    if (!parsedExisting) continue;
    const es =
      parsedExisting.start.getHours() * 60 + parsedExisting.start.getMinutes();
    const ee =
      parsedExisting.end.getHours() * 60 + parsedExisting.end.getMinutes();
    if (!rangesOverlap(newStart, newEnd, es, ee)) continue;

    const evPeople = new Set(
      [ev.coordinatorId, ev.studentCoordinatorId ?? ''].filter(Boolean)
    );
    for (const pid of people) {
      if (evPeople.has(pid)) {
        return 'This coordinator is already assigned to another overlapping event on this day (time conflict).';
      }
    }
  }

  return null;
}
