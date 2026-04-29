import { parseEventStartEnd } from '@/lib/schedule';
import type { EventClosedByRole, EventRegistrationStatus, EventStatus } from '@/types';

export function computeEventStartEnd(date: Date, time: string): { start: Date; end: Date } | null {
  return parseEventStartEnd(new Date(date), time);
}

export function computeRegistrationCloseTime(start: Date): Date {
  return new Date(start.getTime() - 24 * 60 * 60 * 1000);
}

export function computeEventStatus(start: Date, end: Date, now: Date = new Date()): EventStatus {
  if (now < start) return 'UPCOMING';
  if (now >= start && now < end) return 'ONGOING';
  return 'COMPLETED';
}

export function mapUserRoleToClosedByRole(role: string | undefined | null): EventClosedByRole | null {
  if (!role) return null;
  if (role === 'ADMIN') return 'ADMIN';
  if (role === 'FACULTY_COORDINATOR' || role === 'EVENT_COORDINATOR') return 'FACULTY';
  if (role === 'STUDENT_COORDINATOR') return 'STUDENT';
  return null;
}

export function normalizeRegistrationState(params: {
  eventRegistrationStatus?: EventRegistrationStatus | string | null;
  eventRegistrationCloseTime?: Date | null;
  closedByRole?: EventClosedByRole | string | null;
  date: Date;
  time: string;
  now?: Date;
}): {
  start: Date;
  end: Date;
  registrationCloseTime: Date;
  eventStatus: EventStatus;
  registrationStatus: EventRegistrationStatus;
  closedByRole: EventClosedByRole | null;
  autoClosed: boolean;
} | null {
  const now = params.now ?? new Date();
  const startEnd = computeEventStartEnd(params.date, params.time);
  if (!startEnd) return null;

  const start = startEnd.start;
  const end = startEnd.end;
  const computedClose = computeRegistrationCloseTime(start);
  const registrationCloseTime = params.eventRegistrationCloseTime ?? computedClose;

  const currentStatus = (params.eventRegistrationStatus ?? 'OPEN') as EventRegistrationStatus;
  const effectiveStatus: EventRegistrationStatus =
    currentStatus === 'CLOSED' ? 'CLOSED' : now >= registrationCloseTime ? 'CLOSED' : 'OPEN';

  const autoClosed = effectiveStatus === 'CLOSED' && currentStatus !== 'CLOSED' && now >= registrationCloseTime;

  const closedByRole: EventClosedByRole | null =
    effectiveStatus === 'OPEN' ? null : autoClosed ? 'AUTO' : (params.closedByRole as EventClosedByRole | null);

  return {
    start,
    end,
    registrationCloseTime,
    eventStatus: computeEventStatus(start, end, now),
    registrationStatus: effectiveStatus,
    closedByRole,
    autoClosed,
  };
}

