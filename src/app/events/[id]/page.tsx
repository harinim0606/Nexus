'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CountdownTimer from '@/components/CountdownTimer';
import Modal from '@/components/Modal';
import RegistrationForm from '@/components/RegistrationForm';
import toast, { Toaster } from 'react-hot-toast';
import type { Event, TeamMember } from '@/types';
import { motion } from 'framer-motion';

type EventDetail = Event & {
  maxParticipants?: number | null;
  posterUrl?: string | null;
  rules?: string | null;
  onlineLink?: string | null;
  category?: string;
  studentCoordinator?: { name: string } | null;
  stats?: {
    registered: number;
    waitlist: number;
    seatsRemaining: number | null;
    capacity: number | null;
  };
};

export default function EventDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        if (!id) return;
        const res = await fetch(`/api/events/${id}`);
        if (!res.ok) {
          setEvent(null);
          return;
        }
        const found = (await res.json()) as EventDetail;
        setEvent(found);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const capacityLabel = useMemo(() => {
    if (!event) return '';
    if (event.maxParticipants === null || event.maxParticipants === undefined) return 'Unlimited';
    return String(event.maxParticipants);
  }, [event]);

  const handleFormSubmit = async (data: {
    teamName?: string;
    teamMembers?: TeamMember[];
    memberEmails?: string[];
  }) => {
    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event!.id,
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
      toast.success('Registration successful!');
      setShowRegister(false);
    } catch {
      toast.error('Registration failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen nexus-animated-bg">
        <Navbar />
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="space-y-4">
            <div className="h-48 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/80" />
            <div className="h-6 w-2/3 animate-pulse rounded bg-slate-200/70 dark:bg-slate-800/80" />
            <div className="h-24 animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800/80" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen nexus-animated-bg">
        <Navbar />
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="nexus-card rounded-2xl p-6">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Event not found</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              This event may have been removed or is no longer active.
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen nexus-animated-bg">
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="nexus-card rounded-2xl p-6">
            <div className="mb-6 aspect-[16/9] w-full overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-100 via-white to-violet-100 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
              {event.posterUrl ? (
                <Image
                  src={event.posterUrl}
                  alt={event.name}
                  width={1200}
                  height={675}
                  className="h-full w-full object-cover"
                  sizes="(max-width: 1024px) 100vw, 960px"
                  priority
                />
              ) : (
                <div className="flex h-full min-h-[200px] w-full items-center justify-center text-sm font-semibold text-slate-600 dark:text-slate-400">
                  Event visual · add poster URL from admin
                </div>
              )}
            </div>

            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
              {event.category || 'General'}
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{event.name}</h1>
            <p className="mt-3 text-slate-600 dark:text-slate-400">{event.description || 'No description provided.'}</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Schedule</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {new Date(event.date).toLocaleDateString()} • {event.time}
                </p>
                <div className="mt-2">
                  <CountdownTimer eventDate={event.date} eventTime={event.time} />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Venue & links</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{event.venue}</p>
                {event.onlineLink ? (
                  <a
                    href={event.onlineLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Join online
                  </a>
                ) : null}
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Capacity</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{capacityLabel}</p>
                {event.stats ? (
                  <p className="mt-2 text-xs text-slate-500">
                    {event.stats.seatsRemaining === null
                      ? `${event.stats.registered} registered`
                      : `${event.stats.registered} registered · ${event.stats.seatsRemaining} seats left · ${event.stats.waitlist} waitlisted`}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Rules & instructions</h2>
              {event.rules ? (
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{event.rules}</p>
              ) : (
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-300">
                  <li>Carry your college ID (if applicable).</li>
                  <li>QR unlocks for check-in starting 10 minutes before start.</li>
                  <li>For team events, the team lead is responsible for accurate member info.</li>
                </ul>
              )}
            </div>
          </div>

          <aside className="nexus-card h-fit rounded-2xl p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Register</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Sign in with magic link, then register. Coordinators: {event.coordinator.name}
              {event.studentCoordinator ? ` & ${event.studentCoordinator.name}` : ''}.
            </p>
            <button
              type="button"
              onClick={() => setShowRegister(true)}
              className="mt-5 w-full rounded-xl bg-[var(--primary)] py-2.5 text-sm font-semibold text-white transition duration-200 hover:scale-[1.02] hover:bg-[var(--primary-dark)]"
            >
              Register Now
            </button>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/50">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{event.type}</p>
            </div>
          </aside>
        </motion.div>
      </div>

      <Modal open={showRegister} title={`Register for ${event.name}`} onClose={() => setShowRegister(false)}>
        <RegistrationForm eventId={event.id} eventType={event.type} onSubmit={handleFormSubmit} />
      </Modal>

      <Toaster />
      <Footer />
    </div>
  );
}
