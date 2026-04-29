'use client';

import { useEffect, useMemo, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import EventCard from '@/components/EventCard';
import type { Event } from '@/types';

export default function PastEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<string[]>(['all']);
  const [category, setCategory] = useState('all');
  const [q, setQ] = useState('');

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/events?past=1');
      const data = await res.json();
      if (Array.isArray(data)) {
        setEvents(data);
        const cats = new Set<string>(['all']);
        data.forEach((e: Event) => {
          if (e.category) cats.add(e.category);
        });
        setCategories([...cats]);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return events.filter((e) => {
      if (category !== 'all' && e.category !== category) return false;
      if (!qq) return true;
      return (
        e.name.toLowerCase().includes(qq) ||
        (e.description ?? '').toLowerCase().includes(qq) ||
        e.venue.toLowerCase().includes(qq)
      );
    });
  }, [events, category, q]);

  return (
    <div className="min-h-screen nexus-animated-bg">
      <Navbar />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="enter-up mb-8">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white md:text-4xl">Past Events</h1>
          <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
            Browse events that have already ended (registration is disabled).
          </p>
        </div>

        <div className="mb-10 flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search events…"
            className="nexus-focus flex-1 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/80"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="nexus-focus rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900/80"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'all' ? 'All categories' : c}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.length === 0 ? (
            <p className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-400">
              {events.length === 0 ? 'No past events found.' : 'No events match your search or category.'}
            </p>
          ) : (
            filtered.map((event) => <EventCard key={event.id} event={event} onRegister={() => {}} />)
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

