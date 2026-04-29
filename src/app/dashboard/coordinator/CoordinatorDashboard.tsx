'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import DashboardCard from '@/components/DashboardCard';
import ChatWindow from '@/components/ChatWindow';
import toast, { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';
import type { Event, FeedbackQuestion, Registration } from '@/types';

type EventRow = Event & { studentCoordinator?: { name: string } | null };

export default function CoordinatorDashboard() {
  const [stats, setStats] = useState({ totalRegistrations: 0, upcomingEvents: 0, attendance: 0 });
  const [events, setEvents] = useState<EventRow[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [regsLoading, setRegsLoading] = useState(false);
  const [live, setLive] = useState<{
    registered: number;
    waitlist: number;
    checkedIn: number;
    seatsRemaining: number | null;
  } | null>(null);
  const [feedbackQuestions, setFeedbackQuestions] = useState<FeedbackQuestion[]>([
    { id: 'q1', question: 'How would you rate this event?', type: 'rating' },
  ]);
  const [loading, setLoading] = useState(true);

  const refreshEvents = useCallback(async () => {
    const res = await fetch('/api/events?mine=1', { credentials: 'same-origin' });
    const all = (await res.json()) as EventRow[];
    setEvents(all);
    setSelectedEventId((prev) => prev || (all[0]?.id ?? ''));
    setLoading(false);
  }, []);

  const closeRegistration = useCallback(async () => {
    if (!selectedEventId) return;
    const res = await fetch(`/api/events/${encodeURIComponent(selectedEventId)}/close-registration`, {
      method: 'POST',
      credentials: 'same-origin',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || 'Close registration failed');
      return;
    }
    toast.success('Registration closed');
    await refreshEvents();
  }, [refreshEvents, selectedEventId]);

  const refreshStats = useCallback(async () => {
    const res = await fetch('/api/dashboard/stats', { credentials: 'same-origin' });
    const s = await res.json();
    if (!s.error) setStats(s);
  }, []);

  const loadRegistrations = useCallback(async (eventId: string) => {
    if (!eventId) {
      setRegistrations([]);
      return;
    }
    setRegsLoading(true);
    try {
      const res = await fetch(`/api/registrations?eventId=${encodeURIComponent(eventId)}`, {
        credentials: 'same-origin',
      });
      if (!res.ok) {
        toast.error('Could not load registrations');
        setRegistrations([]);
        return;
      }
      const data = (await res.json()) as Registration[];
      setRegistrations(data);
    } finally {
      setRegsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshEvents();
    void refreshStats();
  }, [refreshEvents, refreshStats]);

  useEffect(() => {
    if (!selectedEventId) return;
    void loadRegistrations(selectedEventId);
  }, [selectedEventId, loadRegistrations]);

  useEffect(() => {
    if (!selectedEventId) return;
    const tick = async () => {
      const res = await fetch(`/api/events/${selectedEventId}/live`, { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        setLive({
          registered: data.registered,
          waitlist: data.waitlist,
          checkedIn: data.checkedIn,
          seatsRemaining: data.seatsRemaining,
        });
      }
    };
    void tick();
    const id = setInterval(tick, 8000);
    return () => clearInterval(id);
  }, [selectedEventId]);

  useEffect(() => {
    if (!selectedEventId) return;
    void (async () => {
      const res = await fetch(`/api/feedback?eventId=${encodeURIComponent(selectedEventId)}`, {
        credentials: 'same-origin',
      });
      if (!res.ok) return;
      const form = await res.json();
      if (form?.questions) {
        try {
          const q = JSON.parse(form.questions) as FeedbackQuestion[];
          if (Array.isArray(q) && q.length) setFeedbackQuestions(q);
        } catch {
          /* ignore */
        }
      }
    })();
  }, [selectedEventId]);

  const downloadBlob = async (url: string, filename: string) => {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(err.error || 'Download failed');
      return;
    }
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(href);
    toast.success('Download started');
  };

  const exportRegs = (format: 'pdf' | 'xlsx') => {
    if (!selectedEventId) {
      toast.error('Select an event first');
      return;
    }
    const ext = format === 'pdf' ? 'pdf' : 'xlsx';
    void downloadBlob(
      `/api/exports/registrations?eventId=${selectedEventId}&format=${format}`,
      `nexus-registrations-${selectedEventId}.${ext}`
    );
  };

  const exportAttendance = (format: 'pdf' | 'xlsx') => {
    if (!selectedEventId) {
      toast.error('Select an event first');
      return;
    }
    const ext = format === 'pdf' ? 'pdf' : 'xlsx';
    void downloadBlob(
      `/api/exports/attendance?eventId=${selectedEventId}&format=${format}`,
      `nexus-attendance-${selectedEventId}.${ext}`
    );
  };

  const markPresent = async (registrationId: string) => {
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ registrationId, method: 'MANUAL' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((data as { error?: string }).error || 'Check-in failed');
        return;
      }
      toast.success('Marked present — certificate emailed');
      await loadRegistrations(selectedEventId);
      await refreshStats();
      const liveRes = await fetch(`/api/events/${selectedEventId}/live`, { credentials: 'same-origin' });
      if (liveRes.ok) {
        const d = await liveRes.json();
        setLive({
          registered: d.registered,
          waitlist: d.waitlist,
          checkedIn: d.checkedIn,
          seatsRemaining: d.seatsRemaining,
        });
      }
    } catch {
      toast.error('Check-in failed');
    }
  };

  const saveFeedback = async () => {
    if (!selectedEventId) return;
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ eventId: selectedEventId, questions: feedbackQuestions }),
    });
    if (!res.ok) {
      toast.error('Could not save feedback form');
      return;
    }
    toast.success('Feedback form saved');
  };

  const addQuestion = () => {
    setFeedbackQuestions((q) => [
      ...q,
      {
        id: `q${Date.now()}`,
        question: 'New question',
        type: 'text',
      },
    ]);
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  return (
    <div className="min-h-screen nexus-animated-bg text-[var(--foreground)]">
      <Navbar />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-black md:text-4xl">Coordinator dashboard</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
            View <strong>assigned events only</strong>, participant registrations, attendance, manual check-in, exports, and
            feedback forms for your events.
          </p>
          <Link
            href="/dashboard/coordinator/scan"
            className="mt-4 inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
          >
            Open QR scanner
          </Link>
        </motion.div>

        {loading ? (
          <div className="mt-8 h-24 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-700/40" />
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <DashboardCard title="Registrations (assigned)" value={stats.totalRegistrations} icon="🧾" />
            <DashboardCard title="Upcoming assigned" value={stats.upcomingEvents} icon="📅" />
            <DashboardCard title="Attendance recorded" value={stats.attendance} icon="✅" />
          </div>
        )}

        <section className="nexus-card mt-10 rounded-2xl p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Assigned events</h2>
              <p className="text-sm text-slate-500">
                Faculty and student coordinators only see events they coordinate. Pick one to manage registrations and
                attendance.
              </p>
            </div>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="nexus-focus w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm md:max-w-md dark:border-slate-600 dark:bg-slate-900"
            >
              {events.length === 0 ? <option value="">No events assigned</option> : null}
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} — {new Date(ev.date).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          {selectedEvent ? (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Venue: {selectedEvent.venue} · {selectedEvent.time}
            </p>
          ) : null}

          {selectedEvent ? (
            <button
              type="button"
              onClick={() => void closeRegistration()}
              disabled={selectedEvent.registrationStatus === 'CLOSED'}
              className={`mt-3 w-fit rounded-xl px-4 py-2 text-sm font-semibold transition ${
                selectedEvent.registrationStatus === 'CLOSED'
                  ? 'cursor-not-allowed bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              Close Registration
            </button>
          ) : null}

          {live && selectedEventId ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Registrations', value: live.registered },
                { label: 'Waitlist', value: live.waitlist },
                { label: 'Check-ins', value: live.checkedIn },
                {
                  label: 'Seats left',
                  value: live.seatsRemaining === null ? '∞' : live.seatsRemaining,
                },
              ].map((cell) => (
                <div
                  key={cell.label}
                  className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/80 p-4 dark:border-slate-700 dark:from-slate-900/80 dark:to-slate-950/80"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{cell.label}</p>
                  <p className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">{cell.value}</p>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="nexus-card mt-10 rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Participants &amp; attendance</h2>
          <p className="mt-1 text-sm text-slate-500">
            Registered and waitlisted participants. Manual <strong>Mark present</strong> is for active registrations only
            (same as QR check-in).
          </p>

          {!selectedEventId ? (
            <p className="mt-6 text-sm text-slate-500">Select an event to load registrations.</p>
          ) : regsLoading ? (
            <div className="mt-6 h-32 animate-pulse rounded-xl bg-slate-200/50 dark:bg-slate-800/50" />
          ) : registrations.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">No registrations for this event.</p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500 dark:text-slate-400">
                    <th className="py-2 pr-2">Participant</th>
                    <th className="py-2 pr-2">Email</th>
                    <th className="py-2 pr-2">Status</th>
                    <th className="py-2 pr-2">Attendance</th>
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-3 font-medium text-slate-900 dark:text-slate-100">{r.user.name}</td>
                      <td className="py-3 text-slate-600 dark:text-slate-400">{r.user.email}</td>
                      <td className="py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            r.status === 'CONFIRMED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                              : r.status === 'WAITLISTED'
                                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 text-slate-700 dark:text-slate-300">
                        {r.attendance ? (
                          <span className="text-emerald-700 dark:text-emerald-400">
                            ✓ {new Date(r.attendance.checkedInAt).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3">
                        {r.status === 'CONFIRMED' && !r.attendance ? (
                          <button
                            type="button"
                            onClick={() => void markPresent(r.id)}
                            className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            Mark present
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">
                            {r.status !== 'CONFIRMED' ? 'N/A (not confirmed)' : 'Checked in'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="nexus-card mt-10 rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Exports</h2>
          <p className="mt-1 text-sm text-slate-500">
            Registration lists include all non-cancelled rows. Attendance exports add present/absent and check-in timestamps.
          </p>
          <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:flex-wrap">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Registration list</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => exportRegs('pdf')}
                  className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
                >
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => exportRegs('xlsx')}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 dark:border-slate-600 dark:text-slate-100"
                >
                  Excel
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Attendance report</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => exportAttendance('pdf')}
                  className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
                >
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => exportAttendance('xlsx')}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 dark:border-slate-600 dark:text-slate-100"
                >
                  Excel
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="nexus-card mt-10 rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Feedback form</h2>
          <p className="mt-1 text-sm text-slate-500">
            Build questions for the selected event. Participants submit responses from the event experience flow.
          </p>
          <div className="mt-4 space-y-3">
            {feedbackQuestions.map((q, idx) => (
              <div key={q.id} className="flex flex-col gap-2 rounded-xl border border-slate-200/80 p-3 dark:border-slate-700 md:flex-row md:items-center">
                <input
                  value={q.question}
                  onChange={(e) => {
                    const next = [...feedbackQuestions];
                    next[idx] = { ...q, question: e.target.value };
                    setFeedbackQuestions(next);
                  }}
                  className="nexus-focus flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                />
                <select
                  value={q.type}
                  onChange={(e) => {
                    const next = [...feedbackQuestions];
                    next[idx] = { ...q, type: e.target.value as FeedbackQuestion['type'] };
                    setFeedbackQuestions(next);
                  }}
                  className="nexus-focus rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                >
                  <option value="text">Text</option>
                  <option value="multiple_choice">Multiple choice</option>
                  <option value="rating">Rating</option>
                </select>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={addQuestion} className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              + Add question
            </button>
            <button
              type="button"
              onClick={() => void saveFeedback()}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
            >
              Save for this event
            </button>
          </div>
        </section>

        {selectedEventId ? (
          <div className="mt-10">
            <ChatWindow eventId={selectedEventId} />
          </div>
        ) : null}
      </div>
      <Toaster />
      <Footer />
    </div>
  );
}
