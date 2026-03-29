'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import DashboardCard from '@/components/DashboardCard';
import ChatWindow from '@/components/ChatWindow';
import type { Registration } from '@/types';
import toast, { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';

type RegRow = Registration & {
  attendance?: { id: string; checkedInAt: string } | null;
};

type Notice = { id: string; title: string; body: string; read: boolean; createdAt: string };

type LiveStats = {
  registered: number;
  waitlist: number;
  checkedIn: number;
  seatsRemaining: number | null;
  capacity: number | null;
};

export default function DashboardStudent() {
  const [stats, setStats] = useState({ totalRegistrations: 0, upcomingEvents: 0, attendance: 0 });
  const [registrations, setRegistrations] = useState<RegRow[]>([]);
  const [notifications, setNotifications] = useState<Notice[]>([]);
  const [announcements, setAnnouncements] = useState<Array<{ id: string; message: string; timestamp: string }>>([]);
  const [certs, setCerts] = useState<Array<{ id: string; issuedAt: string; event: { name: string } }>>([]);
  const [chatEventId, setChatEventId] = useState('');
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [liveByEvent, setLiveByEvent] = useState<Record<string, LiveStats | null>>({});

  const load = useCallback(async () => {
    const [statsRes, regsRes, notifRes, annRes, certRes, meRes] = await Promise.all([
      fetch('/api/dashboard/stats', { credentials: 'same-origin' }),
      fetch('/api/registrations/my', { credentials: 'same-origin' }),
      fetch('/api/notifications', { credentials: 'same-origin' }),
      fetch('/api/announcements', { credentials: 'same-origin' }),
      fetch('/api/certificates', { credentials: 'same-origin' }),
      fetch('/api/auth/me', { credentials: 'same-origin' }),
    ]);

    if (statsRes.ok) {
      setStats(await statsRes.json());
    }
    if (regsRes.ok) {
      const regsData = await regsRes.json();
      setRegistrations(regsData);
      setChatEventId((prev) => prev || (regsData[0]?.eventId ?? ''));
    }
    if (notifRes.ok) {
      setNotifications(await notifRes.json());
    }
    if (annRes.ok) {
      setAnnouncements(await annRes.json());
    }
    if (certRes.ok) {
      setCerts(await certRes.json());
    }
    if (meRes.ok) {
      const me = await meRes.json();
      if (me?.user) {
        setProfileName(me.user.name ?? '');
        setProfileEmail(me.user.email ?? '');
      }
    }
    setLoading(false);
  }, []);

  const refreshLiveStats = useCallback(async (regs: RegRow[]) => {
    const ids = [...new Set(regs.map((r) => r.eventId))];
    if (ids.length === 0) {
      setLiveByEvent({});
      return;
    }
    const entries = await Promise.all(
      ids.map(async (eventId) => {
        const res = await fetch(`/api/events/${eventId}/live`, { credentials: 'same-origin' });
        if (!res.ok) return [eventId, null] as const;
        const d = await res.json();
        return [
          eventId,
          {
            registered: d.registered,
            waitlist: d.waitlist,
            checkedIn: d.checkedIn,
            seatsRemaining: d.seatsRemaining,
            capacity: d.capacity ?? null,
          } satisfies LiveStats,
        ] as const;
      })
    );
    setLiveByEvent(Object.fromEntries(entries));
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 20000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    void refreshLiveStats(registrations);
    const id = setInterval(() => void refreshLiveStats(registrations), 12000);
    return () => clearInterval(id);
  }, [registrations, refreshLiveStats]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ name: profileName }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error((data as { error?: string }).error || 'Could not update profile');
      return;
    }
    toast.success('Profile updated');
    await load();
  };

  const cancelReg = async (id: string) => {
    if (!confirm('Cancel this registration? If you were confirmed, the next person on the waitlist may be promoted.'))
      return;
    const res = await fetch(`/api/registrations/${id}`, { method: 'DELETE', credentials: 'same-origin' });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || 'Could not cancel');
      return;
    }
    toast.success('Registration cancelled');
    await load();
  };

  const markNotifRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ id, read: true }),
    });
    setNotifications((n) => n.map((x) => (x.id === id ? { ...x, read: true } : x)));
  };

  const openQr = async (registrationId: string, eventName: string) => {
    const res = await fetch(`/api/registrations/${registrationId}/qr`, { credentials: 'same-origin' });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || 'QR not available yet');
      return;
    }
    window.open(data.qrDataUrl, '_blank');
    toast.success(`${eventName} QR opened in a new tab`);
  };

  const downloadCertificate = async (certId: string, eventName: string) => {
    try {
      const res = await fetch(`/api/certificates/${certId}/download`, { credentials: 'same-origin' });
      if (!res.ok) {
        toast.error('Could not download certificate');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexus-certificate-${eventName.replace(/\s+/g, '-')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch {
      toast.error('Download failed');
    }
  };

  return (
    <div className="min-h-screen nexus-animated-bg text-[var(--foreground)]">
      <Navbar />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <h1 className="text-3xl font-black md:text-4xl">Participant dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Registered events, live event stats, announcements, certificates, notifications, and profile — with smart
            waitlist when events are full.
          </p>
        </motion.div>

        {loading ? (
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-700/40" />
            ))}
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <DashboardCard title="My registrations" value={stats.totalRegistrations} icon="🧾" />
            <DashboardCard title="Upcoming" value={stats.upcomingEvents} icon="📅" />
            <DashboardCard title="Check-ins" value={stats.attendance} icon="✅" />
          </div>
        )}

        <section className="nexus-card mt-10 rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold">Profile</h2>
          <p className="mb-4 text-sm text-slate-500">Update how your name appears on registrations and certificates.</p>
          <form onSubmit={saveProfile} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Display name</label>
              <input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="nexus-focus w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                required
                maxLength={120}
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Email</label>
              <input
                value={profileEmail}
                readOnly
                className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
            >
              Save
            </button>
          </form>
        </section>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <section className="nexus-card rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Notifications</h2>
              <Link href="/explore-events" className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">
                Explore events
              </Link>
            </div>
            <ul className="max-h-64 space-y-3 overflow-y-auto">
              {notifications.length === 0 ? (
                <li className="text-sm text-slate-500">You&apos;re all caught up.</li>
              ) : (
                notifications.slice(0, 12).map((n) => (
                  <li
                    key={n.id}
                    className={`rounded-xl border px-3 py-2 text-sm ${
                      n.read
                        ? 'border-slate-200/80 bg-white/50 dark:border-slate-700 dark:bg-slate-900/40'
                        : 'border-blue-200 bg-blue-50/70 dark:border-blue-900/50 dark:bg-blue-950/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{n.title}</p>
                        <p className="text-slate-600 dark:text-slate-400">{n.body}</p>
                      </div>
                      {!n.read ? (
                        <button
                          type="button"
                          onClick={() => markNotifRead(n.id)}
                          className="shrink-0 text-xs font-semibold text-blue-600 dark:text-blue-400"
                        >
                          Mark read
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="nexus-card rounded-2xl p-6">
            <h2 className="mb-4 text-lg font-semibold">Announcements</h2>
            <ul className="max-h-64 space-y-3 overflow-y-auto text-sm">
              {announcements.length === 0 ? (
                <li className="text-slate-500">No announcements yet.</li>
              ) : (
                announcements.slice(0, 8).map((a) => (
                  <li key={a.id} className="rounded-xl border border-slate-200/80 bg-white/60 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/40">
                    <p className="text-slate-800 dark:text-slate-200">{a.message}</p>
                    <p className="mt-1 text-xs text-slate-400">{new Date(a.timestamp).toLocaleString()}</p>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>

        <section className="nexus-card mt-10 rounded-2xl p-6">
          <h2 className="mb-2 text-lg font-semibold">Live event dashboard</h2>
          <p className="mb-4 text-sm text-slate-500">
            Real-time counts for your events (updates every ~12s): registrations, seats remaining, waitlist, and check-ins.
          </p>
          {registrations.length === 0 ? (
            <p className="text-sm text-slate-500">Register for an event to see live stats.</p>
          ) : (
            <div className="space-y-6">
              {registrations.map((reg) => {
                const live = liveByEvent[reg.eventId];
                return (
                  <div key={reg.id} className="rounded-2xl border border-slate-200/80 p-4 dark:border-slate-700">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{reg.event.name}</p>
                    {live ? (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                          { label: 'Registrations', value: live.registered },
                          { label: 'Seats left', value: live.seatsRemaining === null ? '∞' : live.seatsRemaining },
                          { label: 'Waitlist', value: live.waitlist },
                          { label: 'Check-ins', value: live.checkedIn },
                        ].map((cell) => (
                          <div key={cell.label} className="rounded-xl bg-slate-50/80 px-3 py-2 dark:bg-slate-900/50">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{cell.label}</p>
                            <p className="text-lg font-black text-slate-900 dark:text-slate-100">{cell.value}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-slate-400">Loading stats…</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="nexus-card mt-10 rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold">Registered events</h2>
          <div className="space-y-3">
            {registrations.length === 0 ? (
              <p className="text-sm text-slate-500">
                No active registrations.{' '}
                <Link href="/explore-events" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
                  Browse events
                </Link>
              </p>
            ) : (
              registrations.map((reg) => (
                <div
                  key={reg.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white/70 p-4 md:flex-row md:items-center md:justify-between dark:border-slate-700 dark:bg-slate-900/40"
                >
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{reg.event.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {new Date(reg.event.date).toLocaleDateString()} • {reg.event.time}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">Status: {reg.status}</p>
                    {reg.attendance ? (
                      <p className="text-xs text-emerald-600">Checked in</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {reg.status === 'REGISTERED' ? (
                      <button
                        type="button"
                        onClick={() => openQr(reg.id, reg.event.name)}
                        className="rounded-xl bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white hover:opacity-95"
                      >
                        QR check-in
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => cancelReg(reg.id)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200"
                    >
                      Cancel registration
                    </button>
                    <Link
                      href={`/events/${reg.event.id}`}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="nexus-card mt-10 rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold">Certificates</h2>
          {certs.length === 0 ? (
            <p className="text-sm text-slate-500">Certificates issued by organizers will appear here.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {certs.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-col gap-2 rounded-xl border border-slate-200/80 px-3 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700"
                >
                  <div>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{c.event.name}</span>
                    <span className="ml-2 text-xs text-slate-500">{new Date(c.issuedAt).toLocaleDateString()}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void downloadCertificate(c.id, c.event.name)}
                    className="shrink-0 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Download PDF
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {chatEventId ? (
          <div className="mt-10">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Chat for event:</span>
              <select
                value={chatEventId}
                onChange={(e) => setChatEventId(e.target.value)}
                className="nexus-focus rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
              >
                {registrations.map((r) => (
                  <option key={r.eventId} value={r.eventId}>
                    {r.event.name}
                  </option>
                ))}
              </select>
            </div>
            <ChatWindow eventId={chatEventId} />
          </div>
        ) : null}
      </div>
      <Toaster />
      <Footer />
    </div>
  );
}
