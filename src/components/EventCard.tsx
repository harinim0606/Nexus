'use client';

import { useEffect, useMemo, useState } from 'react';
import { Event } from '@/types';
import { format } from 'date-fns';
import CountdownTimer from './CountdownTimer';
import Link from 'next/link';
import { parseEventStartEnd } from '@/lib/schedule';

interface EventCardProps {
  event: Event;
  onRegister: (eventId: string) => void;
}

export default function EventCard({ event, onRegister }: EventCardProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  const canRegister = useMemo(() => {
    const status = event.registrationStatus ?? 'OPEN';
    if (status === 'CLOSED') return false;

    const parsed = parseEventStartEnd(new Date(event.date), event.time);
    if (!parsed) return true;

    return now < parsed.start.getTime();
  }, [event.date, event.time, event.registrationStatus, now]);

  return (
    <div className="nexus-card group rounded-2xl p-6 transition duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-xl">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link href={`/events/${event.id}`} className="text-xl font-semibold text-slate-900 hover:text-blue-700 dark:text-white dark:hover:text-blue-400">
          {event.name}
        </Link>
        <div className="flex flex-wrap gap-1.5 justify-end">
          {event.category ? (
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800 dark:bg-blue-950/60 dark:text-blue-200">
              {event.category}
            </span>
          ) : null}
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-200">{event.type}</span>
        </div>
      </div>
      <p className="mb-4 line-clamp-2 text-sm text-slate-600">{event.description || 'No description provided.'}</p>
      <div className="space-y-2 mb-5 text-sm text-slate-700">
        <p><strong>Date:</strong> {format(event.date, 'PPP')}</p>
        <p><strong>Time:</strong> {event.time}</p>
        <p><strong>Venue:</strong> {event.venue}</p>
        <CountdownTimer eventDate={event.date} eventTime={event.time} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Link
          href={`/events/${event.id}`}
          className="w-full rounded-xl border border-slate-200 bg-white/90 py-2.5 text-center text-sm font-semibold text-slate-700 transition duration-200 hover:scale-[1.02] hover:border-blue-300 hover:text-blue-700"
        >
          View Details
        </Link>
        <button
          onClick={() => {
            if (!canRegister) return;
            onRegister(event.id);
          }}
          disabled={!canRegister}
          className={`w-full rounded-xl py-2.5 text-sm font-semibold transition duration-200 ${
            canRegister
              ? 'bg-[var(--primary)] text-white hover:scale-[1.02] hover:bg-[var(--primary-dark)]'
              : 'cursor-not-allowed bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          {canRegister ? 'Register' : 'Registration Closed'}
        </button>
      </div>
    </div>
  );
}