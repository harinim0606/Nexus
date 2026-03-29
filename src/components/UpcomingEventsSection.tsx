'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import EventCard from '@/components/EventCard';
import type { Event } from '@/types';
import Modal from '@/components/Modal';
import RegistrationForm from '@/components/RegistrationForm';
import type { TeamMember } from '@/types';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function UpcomingEventsSection() {
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<string[]>(['all']);
  const [category, setCategory] = useState('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Event | null>(null);
  const [modal, setModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/events');
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

  const onRegister = (eventId: string) => {
    const ev = events.find((x) => x.id === eventId);
    if (ev) {
      setSelected(ev);
      setModal(true);
    }
  };

  const submitReg = async (data: { teamName?: string; teamMembers?: TeamMember[]; memberEmails?: string[] }) => {
    if (!selected) return;
    const res = await fetch('/api/registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: selected.id,
        teamMembers: data.teamMembers,
        teamName: data.teamName,
        memberEmails: data.memberEmails,
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      toast.error(body?.error || 'Registration failed');
      return;
    }
    toast.success('Registered!');
    setModal(false);
    setSelected(null);
  };

  return (
    <section className="relative px-6 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">Upcoming</p>
          <h2 className="mt-3 text-3xl font-black text-slate-900 dark:text-white md:text-4xl">Upcoming events</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
            Filter by category, search by name or venue, then dive into details or register in one flow.
          </p>
        </motion.div>

        <div className="mx-auto mt-10 flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center">
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
          <Link
            href="/explore-events"
            className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-center text-sm font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            Full explore →
          </Link>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-40px' }}
          className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {filtered.slice(0, 6).map((event) => (
            <motion.div key={event.id} variants={item}>
              <EventCard event={event} onRegister={onRegister} />
            </motion.div>
          ))}
        </motion.div>
      </div>

      <Modal open={modal && !!selected} title={selected ? `Register · ${selected.name}` : 'Register'} onClose={() => setModal(false)}>
        {selected ? (
          <RegistrationForm
            eventId={selected.id}
            eventType={selected.type}
            onSubmit={(data) =>
              submitReg({
                teamName: data.teamName,
                teamMembers: data.teamMembers,
                memberEmails: data.memberEmails,
              })
            }
          />
        ) : null}
      </Modal>
      <Toaster />
    </section>
  );
}
