'use client';

import { Event } from '@/types';
import { format } from 'date-fns';
import CountdownTimer from './CountdownTimer';

interface EventCardProps {
  event: Event;
  onRegister: (eventId: string) => void;
}

export default function EventCard({ event, onRegister }: EventCardProps) {
  return (
    <div className="nexus-card group rounded-2xl p-6 transition duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold text-slate-900">{event.name}</h3>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{event.type}</span>
      </div>
      <p className="mb-4 line-clamp-2 text-sm text-slate-600">{event.description || 'No description provided.'}</p>
      <div className="space-y-2 mb-5 text-sm text-slate-700">
        <p><strong>Date:</strong> {format(event.date, 'PPP')}</p>
        <p><strong>Time:</strong> {event.time}</p>
        <p><strong>Venue:</strong> {event.venue}</p>
        <CountdownTimer eventDate={event.date} eventTime={event.time} />
      </div>
      <button
        onClick={() => onRegister(event.id)}
        className="w-full rounded-xl bg-[var(--primary)] py-2.5 text-sm font-semibold text-white transition duration-200 hover:scale-[1.02] hover:bg-[var(--primary-dark)]"
      >
        Register
      </button>
    </div>
  );
}