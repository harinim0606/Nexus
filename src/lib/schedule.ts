/**
 * Centralized parsing helpers for event schedule data.
 *
 * We store `Event.time` as a human string, but for overlap checks, QR windows, and countdowns we need
 * a reliable interpretation of the start/end times.
 *
 * Expected format (for correct parsing/conflict detection):
 *   "HH:mm - HH:mm"   (24-hour times, e.g. "10:30 - 12:00")
 */

export type ParsedTimeRange = {
  startMinutes: number; // minutes from 00:00
  endMinutes: number; // minutes from 00:00
};

export function parseTimeRange(time: string): ParsedTimeRange | null {
  const normalized = (time ?? '').trim();
  // Accept "HH:mm - HH:mm" or "HH:mm-HH:mm"
  const match = normalized.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
  if (!match) return null;

  const toMinutes = (hhmm: string) => {
    const [hStr, mStr] = hhmm.split(':');
    const h = Number.parseInt(hStr, 10);
    const m = Number.parseInt(mStr, 10);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  };

  const start = toMinutes(match[1]);
  const end = toMinutes(match[2]);
  if (start === null || end === null) return null;
  if (end <= start) return null;
  return { startMinutes: start, endMinutes: end };
}

export function parseEventStartEnd(date: Date, time: string): { start: Date; end: Date } | null {
  const range = parseTimeRange(time);
  if (!range) return null;

  const start = new Date(date);
  start.setHours(Math.floor(range.startMinutes / 60), range.startMinutes % 60, 0, 0);

  const end = new Date(date);
  end.setHours(Math.floor(range.endMinutes / 60), range.endMinutes % 60, 0, 0);

  return { start, end };
}

export function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function startOfLocalDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfLocalDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

