'use client';

import { useEffect, useMemo, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Event, User } from '@/types';
import toast, { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';
import CertificateDesignerPanel from '@/components/admin/CertificateDesignerPanel';

type EventRow = Event & {
  studentCoordinator?: { id: string; name: string } | null;
};

type Tab = 'events' | 'users' | 'announcements' | 'reports' | 'certificates';

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: 'events', label: 'Events', hint: 'Create / edit / delete, clash checks, coordinators' },
  { id: 'users', label: 'Users', hint: 'All accounts & coordinator roles' },
  { id: 'announcements', label: 'Announcements', hint: 'Email + in-app broadcasts' },
  { id: 'reports', label: 'Reports', hint: 'Export registrations' },
  { id: 'certificates', label: 'Certificates', hint: 'Template, drag fields, preview, bulk' },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('events');
  const [events, setEvents] = useState<EventRow[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [roleEdits, setRoleEdits] = useState<Record<string, string>>({});
  const [facultyCoords, setFacultyCoords] = useState<User[]>([]);
  const [studentCoords, setStudentCoords] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    venue: '',
    type: 'INDIVIDUAL',
    maxParticipants: '',
    coordinatorId: '',
    studentCoordinatorId: '',
    posterUrl: '',
    onlineLink: '',
    rules: '',
    category: 'General',
  });

  const [newCoord, setNewCoord] = useState({
    email: '',
    name: '',
    password: '',
    role: 'STUDENT_COORDINATOR' as 'STUDENT_COORDINATOR' | 'FACULTY_COORDINATOR' | 'EVENT_COORDINATOR',
  });

  const [broadcast, setBroadcast] = useState({
    subject: '',
    message: '',
    audience: 'ALL_USERS',
    eventId: '',
  });

  const [certEventId, setCertEventId] = useState('');

  const loadUsers = async () => {
    const usersRes = await fetch('/api/users');
    if (!usersRes.ok) {
      toast.error('Could not load users');
      return;
    }
    const usersData = (await usersRes.json()) as User[];
    setUsers(usersData);
    const edits: Record<string, string> = {};
    usersData.forEach((u) => {
      edits[u.id] = u.role;
    });
    setRoleEdits(edits);
    setFacultyCoords(usersData.filter((u) => u.role === 'EVENT_COORDINATOR' || u.role === 'FACULTY_COORDINATOR'));
    setStudentCoords(usersData.filter((u) => u.role === 'STUDENT_COORDINATOR'));
  };

  const refreshEvents = async () => {
    const eventsRes = await fetch('/api/events?admin=1', { credentials: 'same-origin' });
    const eventsData = await eventsRes.json();
    setEvents(eventsData);
    setCertEventId((prev) => prev || (eventsData[0]?.id ?? ''));
  };

  const downloadExport = async (eventId: string, format: 'pdf' | 'xlsx') => {
    try {
      const res = await fetch(`/api/exports/registrations?eventId=${eventId}&format=${format}`, {
        credentials: 'same-origin',
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error || 'Export failed');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexus-registrations-${eventId}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch {
      toast.error('Export failed');
    }
  };

  useEffect(() => {
    const load = async () => {
      await refreshEvents();
      await loadUsers();
    };
    load();
  }, []);

  const certEventName = useMemo(() => events.find((e) => e.id === certEventId)?.name ?? '', [events, certEventId]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(q));
  }, [users, userSearch]);

  const parseStartEndFromTime = (time: string) => {
    const match = (time ?? '').match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    if (!match) return { startTime: '', endTime: '' };
    return { startTime: match[1], endTime: match[2] };
  };

  const openEdit = (event: EventRow) => {
    const { startTime, endTime } = parseStartEndFromTime(event.time);
    setEditingEventId(event.id);
    setShowForm(true);
    setFormData({
      name: event.name,
      description: event.description ?? '',
      date: new Date(event.date).toISOString().slice(0, 10),
      startTime,
      endTime,
      venue: event.venue,
      type: event.type,
      maxParticipants: event.maxParticipants ? String(event.maxParticipants) : '',
      coordinatorId: event.coordinatorId,
      studentCoordinatorId: event.studentCoordinatorId ?? '',
      posterUrl: event.posterUrl ?? '',
      onlineLink: event.onlineLink ?? '',
      rules: event.rules ?? '',
      category: event.category ?? 'General',
    });
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Archive this event? It will be hidden from the public site; registrations stay in the database.')) return;
    try {
      const res = await fetch('/api/events', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eventId }),
      });
      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || 'Failed to delete event');
        return;
      }
      toast.success('Event archived (hidden from public)');
      await refreshEvents();
    } catch {
      toast.error('Failed to delete event');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const time = formData.startTime && formData.endTime ? `${formData.startTime} - ${formData.endTime}` : '';
      const payload = {
        name: formData.name,
        description: formData.description,
        date: formData.date,
        time,
        venue: formData.venue,
        type: formData.type,
        maxParticipants: formData.maxParticipants ? Number(formData.maxParticipants) : null,
        coordinatorId: formData.coordinatorId,
        studentCoordinatorId: formData.studentCoordinatorId || null,
        posterUrl: formData.posterUrl || null,
        onlineLink: formData.onlineLink || null,
        rules: formData.rules || null,
        category: formData.category,
      };

      const method = editingEventId ? 'PUT' : 'POST';
      const res = await fetch('/api/events', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingEventId ? { id: editingEventId, ...payload } : payload),
      });
      if (res.ok) {
        toast.success(editingEventId ? 'Event updated!' : 'Event created!');
        setShowForm(false);
        setEditingEventId(null);
        setFormData({
          name: '',
          description: '',
          date: '',
          startTime: '',
          endTime: '',
          venue: '',
          type: 'INDIVIDUAL',
          maxParticipants: '',
          coordinatorId: '',
          studentCoordinatorId: '',
          posterUrl: '',
          onlineLink: '',
          rules: '',
          category: 'General',
        });
        await refreshEvents();
        await loadUsers();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Request failed');
      }
    } catch {
      toast.error('Failed to save event');
    }
  };

  const sendBroadcast = async () => {
    if (!broadcast.message.trim()) {
      toast.error('Message required');
      return;
    }
    if (broadcast.audience !== 'ALL_USERS' && !broadcast.eventId) {
      toast.error('Pick an event for targeted broadcast');
      return;
    }
    const res = await fetch('/api/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: broadcast.message,
        subject: broadcast.subject,
        audience: broadcast.audience,
        eventId: broadcast.audience === 'ALL_USERS' ? null : broadcast.eventId,
      }),
    });
    if (!res.ok) {
      toast.error('Broadcast failed');
      return;
    }
    toast.success('Announcement sent');
    setBroadcast({ subject: '', message: '', audience: 'ALL_USERS', eventId: '' });
  };

  const saveUserRole = async (userId: string) => {
    const role = roleEdits[userId];
    if (!role) return;
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error || 'Update failed');
      return;
    }
    toast.success('Role updated');
    await loadUsers();
  };

  const createCoordinator = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCoord),
    });
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error || 'Could not create user');
      return;
    }
    toast.success('Coordinator account created');
    setNewCoord({ email: '', name: '', password: '', role: 'STUDENT_COORDINATOR' });
    await loadUsers();
  };

  const resetForm = () => {
    setEditingEventId(null);
    setShowForm(true);
    setFormData({
      name: '',
      description: '',
      date: '',
      startTime: '',
      endTime: '',
      venue: '',
      type: 'INDIVIDUAL',
      maxParticipants: '',
      coordinatorId: '',
      studentCoordinatorId: '',
      posterUrl: '',
      onlineLink: '',
      rules: '',
      category: 'General',
    });
  };

  const ROLE_OPTIONS = [
    'ADMIN',
    'FACULTY_COORDINATOR',
    'EVENT_COORDINATOR',
    'STUDENT_COORDINATOR',
    'STUDENT',
    'PARTICIPANT',
  ] as const;

  return (
    <div className="min-h-screen nexus-animated-bg">
      <Navbar />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white md:text-4xl">Admin dashboard</h1>
          <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-400">
            Event lifecycle, user & coordinator management, targeted announcements, registration exports, and certificate
            tooling — in one place.
          </p>
        </motion.div>

        <div className="mt-8 flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-700">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                tab === t.id
                  ? 'bg-[var(--primary)] text-white shadow-md shadow-blue-500/20'
                  : 'bg-white/80 text-slate-700 hover:bg-white dark:bg-slate-800/80 dark:text-slate-200'
              }`}
              title={t.hint}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'events' ? (
          <div className="mt-8 space-y-6">
            <div className="nexus-card rounded-2xl p-5 text-sm text-slate-600 dark:text-slate-400">
              <p className="font-semibold text-slate-900 dark:text-white">Event rules</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  <strong>Venue + time:</strong> no two active events may use the same venue with overlapping times on the same day.
                </li>
                <li>
                  <strong>Coordinators:</strong> one faculty and one optional student coordinator per event; the same person
                  cannot be assigned to two overlapping events on the same day.
                </li>
                <li>
                  <strong>Delete</strong> archives the event (soft delete); it no longer appears in public listings.
                </li>
              </ul>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20"
              >
                Create event
              </button>
            </div>
            <div className="nexus-card rounded-2xl p-6">
              <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">All events</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead>
                    <tr className="border-b text-left text-sm text-slate-500">
                      <th className="py-2">Name</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Date</th>
                      <th className="py-2">Venue</th>
                      <th className="py-2">Faculty</th>
                      <th className="py-2">Student coord.</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr key={event.id} className="border-b border-slate-100 text-sm dark:border-slate-800">
                        <td className="py-3 font-medium text-slate-900 dark:text-slate-100">{event.name}</td>
                        <td className="py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              event.isActive
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                                : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {event.isActive ? 'Active' : 'Archived'}
                          </span>
                        </td>
                        <td className="py-3">{new Date(event.date).toLocaleDateString()}</td>
                        <td className="py-3">{event.venue}</td>
                        <td className="py-3">{event.coordinator.name}</td>
                        <td className="py-3">{event.studentCoordinator?.name ?? '—'}</td>
                        <td className="py-3">
                          <button
                            type="button"
                            className="mr-3 font-semibold text-indigo-600 dark:text-indigo-400"
                            onClick={() => openEdit(event)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="font-semibold text-red-600"
                            onClick={() => handleDelete(event.id)}
                            disabled={!event.isActive}
                            title={!event.isActive ? 'Already archived' : 'Archive event'}
                          >
                            Archive
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        {tab === 'users' ? (
          <div className="mt-8 space-y-8">
            <section className="nexus-card rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Add coordinator</h2>
              <p className="mt-1 text-sm text-slate-500">Creates a verified account with password (faculty / student / event coordinator).</p>
              <form onSubmit={createCoordinator} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <input
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                  placeholder="Email"
                  type="email"
                  value={newCoord.email}
                  onChange={(e) => setNewCoord({ ...newCoord, email: e.target.value })}
                  required
                />
                <input
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                  placeholder="Full name"
                  value={newCoord.name}
                  onChange={(e) => setNewCoord({ ...newCoord, name: e.target.value })}
                  required
                />
                <input
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                  placeholder="Temp password"
                  type="password"
                  value={newCoord.password}
                  onChange={(e) => setNewCoord({ ...newCoord, password: e.target.value })}
                  required
                />
                <select
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                  value={newCoord.role}
                  onChange={(e) =>
                    setNewCoord({
                      ...newCoord,
                      role: e.target.value as typeof newCoord.role,
                    })
                  }
                >
                  <option value="FACULTY_COORDINATOR">Faculty coordinator</option>
                  <option value="EVENT_COORDINATOR">Event coordinator</option>
                  <option value="STUDENT_COORDINATOR">Student coordinator</option>
                </select>
                <div className="sm:col-span-2 lg:col-span-4">
                  <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">
                    Create account
                  </button>
                </div>
              </form>
            </section>

            <section className="nexus-card rounded-2xl p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">All users ({users.length})</h2>
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm sm:max-w-xs dark:border-slate-600 dark:bg-slate-900"
                  placeholder="Search name, email, role…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="py-2">Name</th>
                      <th className="py-2">Email</th>
                      <th className="py-2">Role</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2 font-medium text-slate-900 dark:text-slate-100">{u.name}</td>
                        <td className="py-2 text-slate-600 dark:text-slate-400">{u.email}</td>
                        <td className="py-2">
                          <select
                            className="w-full max-w-[200px] rounded-lg border border-slate-200 px-2 py-1 dark:border-slate-600 dark:bg-slate-900"
                            value={roleEdits[u.id] ?? u.role}
                            onChange={(e) => setRoleEdits((prev) => ({ ...prev, [u.id]: e.target.value }))}
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2">
                          <button
                            type="button"
                            onClick={() => saveUserRole(u.id)}
                            className="rounded-lg bg-[var(--primary)] px-3 py-1 text-xs font-semibold text-white"
                          >
                            Save role
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : null}

        {tab === 'announcements' ? (
          <div className="mt-8 max-w-xl">
            <section className="nexus-card rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Broadcast</h2>
              <p className="mt-1 text-sm text-slate-500">
                Sends email and creates an in-app notification. Target: all users, event participants only, or waitlist only.
              </p>
              <div className="mt-4 space-y-3">
                <input
                  className="w-full rounded-xl border border-slate-200 p-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                  placeholder="Subject"
                  value={broadcast.subject}
                  onChange={(e) => setBroadcast({ ...broadcast, subject: e.target.value })}
                />
                <textarea
                  className="w-full rounded-xl border border-slate-200 p-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                  placeholder="Message"
                  rows={5}
                  value={broadcast.message}
                  onChange={(e) => setBroadcast({ ...broadcast, message: e.target.value })}
                />
                <select
                  className="w-full rounded-xl border border-slate-200 p-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                  value={broadcast.audience}
                  onChange={(e) => setBroadcast({ ...broadcast, audience: e.target.value })}
                >
                  <option value="ALL_USERS">All users</option>
                  <option value="EVENT_PARTICIPANTS">Event participants</option>
                  <option value="EVENT_WAITLIST">Waitlist users</option>
                </select>
                {broadcast.audience !== 'ALL_USERS' ? (
                  <select
                    className="w-full rounded-xl border border-slate-200 p-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                    value={broadcast.eventId}
                    onChange={(e) => setBroadcast({ ...broadcast, eventId: e.target.value })}
                  >
                    <option value="">Select event</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.name}
                      </option>
                    ))}
                  </select>
                ) : null}
                <button
                  type="button"
                  onClick={sendBroadcast}
                  className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
                >
                  Send broadcast
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {tab === 'reports' ? (
          <div className="mt-8">
            <section className="nexus-card rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Registration exports</h2>
              <p className="mt-1 text-sm text-slate-500">
                Download participant lists per event as PDF or Excel (signed-in session required — uses secure download).
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="py-2">Event</th>
                      <th className="py-2">Date</th>
                      <th className="py-2">Exports</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((ev) => (
                      <tr key={ev.id} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-3 font-medium">{ev.name}</td>
                        <td className="py-3">{new Date(ev.date).toLocaleDateString()}</td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void downloadExport(ev.id, 'pdf')}
                              className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              PDF
                            </button>
                            <button
                              type="button"
                              onClick={() => void downloadExport(ev.id, 'xlsx')}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold dark:border-slate-600"
                            >
                              Excel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : null}

        {tab === 'certificates' ? (
          <div className="mt-8">
            <section className="nexus-card rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Certificate system</h2>
              <p className="mt-1 text-sm text-slate-500">
                Upload a background, drag text bindings, preview a sample PDF, save, then bulk issue to registered attendees
                (emails include a download link).
              </p>
              <div className="mt-6">
                {certEventId ? (
                  <CertificateDesignerPanel
                    eventId={certEventId}
                    eventName={certEventName}
                    events={events.map((e) => ({ id: e.id, name: e.name }))}
                    onEventChange={setCertEventId}
                  />
                ) : (
                  <p className="text-sm text-slate-500">Create an event first to design certificates.</p>
                )}
              </div>
            </section>
          </div>
        ) : null}

        {showForm ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 dark:bg-slate-900">
              <h2 className="mb-4 text-xl font-semibold dark:text-white">{editingEventId ? 'Edit event' : 'Create event'}</h2>
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="text"
                  placeholder="Event name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2 dark:border-slate-600 dark:bg-slate-950"
                  required
                />
                <textarea
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2 dark:border-slate-600 dark:bg-slate-950"
                />
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2 dark:border-slate-600 dark:bg-slate-950"
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2 dark:border-slate-600 dark:bg-slate-950"
                    required
                  />
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2 dark:border-slate-600 dark:bg-slate-950"
                    required
                  />
                </div>
                <input
                  type="text"
                  placeholder="Venue"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2 dark:border-slate-600 dark:bg-slate-950"
                  required
                />
                <input
                  type="text"
                  placeholder="Category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2 dark:border-slate-600 dark:bg-slate-950"
                />
                <input
                  type="url"
                  placeholder="Poster image URL"
                  value={formData.posterUrl}
                  onChange={(e) => setFormData({ ...formData, posterUrl: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2 dark:border-slate-600 dark:bg-slate-950"
                />
                <input
                  type="url"
                  placeholder="Online / stream link"
                  value={formData.onlineLink}
                  onChange={(e) => setFormData({ ...formData, onlineLink: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2 dark:border-slate-600 dark:bg-slate-950"
                />
                <textarea
                  placeholder="Rules & instructions"
                  value={formData.rules}
                  onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2 dark:border-slate-600 dark:bg-slate-950"
                  rows={3}
                />
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2 dark:border-slate-600 dark:bg-slate-950"
                >
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="TEAM">Team</option>
                </select>
                <input
                  type="number"
                  placeholder="Max participants"
                  value={formData.maxParticipants}
                  onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2 dark:border-slate-600 dark:bg-slate-950"
                />
                <select
                  value={formData.coordinatorId}
                  onChange={(e) => setFormData({ ...formData, coordinatorId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2 dark:border-slate-600 dark:bg-slate-950"
                  required
                >
                  <option value="">Faculty coordinator</option>
                  {facultyCoords.map((coord) => (
                    <option key={coord.id} value={coord.id}>
                      {coord.name}
                    </option>
                  ))}
                </select>
                <select
                  value={formData.studentCoordinatorId}
                  onChange={(e) => setFormData({ ...formData, studentCoordinatorId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2 dark:border-slate-600 dark:bg-slate-950"
                >
                  <option value="">Student coordinator (optional)</option>
                  {studentCoords.map((coord) => (
                    <option key={coord.id} value={coord.id}>
                      {coord.name}
                    </option>
                  ))}
                </select>
                <button type="submit" className="w-full rounded-xl bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700">
                  {editingEventId ? 'Save' : 'Create'}
                </button>
              </form>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingEventId(null);
                }}
                className="mt-4 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <Toaster />
    </div>
  );
}
