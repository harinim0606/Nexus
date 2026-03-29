'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import DashboardCard from '@/components/DashboardCard';
import ChatWindow from '@/components/ChatWindow';
import { Registration } from '@/types';
import toast, { Toaster } from 'react-hot-toast';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalRegistrations: 0,
    upcomingEvents: 0,
    attendance: 0,
  });
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'REGISTERED' | 'WAITLIST'>('ALL');
  const [chatEventId, setChatEventId] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      // Fetch stats from API
      const statsRes = await fetch('/api/dashboard/stats');
      const statsData = await statsRes.json();
      setStats(statsData);

      const regsRes = await fetch('/api/registrations');
      const regsData = await regsRes.json();
      setRegistrations(regsData);
      if (!chatEventId && regsData.length > 0) {
        setChatEventId(regsData[0].eventId);
      }
    };

    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const markAttendance = async (registrationId: string) => {
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationId, method: 'MANUAL' }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || 'Failed to mark attendance');
      return;
    }
    toast.success('Attendance marked');
    const regsRes = await fetch('/api/registrations');
    const regsData = await regsRes.json();
    setRegistrations(regsData);
  };

  return (
    <div className="min-h-screen nexus-animated-bg">
      <Navbar />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="enter-up text-3xl font-black text-slate-900 mb-8 md:text-4xl">Dashboard</h1>

        {/* Animated stat cards */}
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          <DashboardCard title="Total Registrations" value={stats.totalRegistrations} icon="🧾" />
          <DashboardCard title="Upcoming Events" value={stats.upcomingEvents} icon="📅" />
          <DashboardCard title="Attendance" value={stats.attendance} icon="✅" />
        </div>

        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by event or user..."
            className="nexus-focus w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm md:max-w-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'REGISTERED' | 'WAITLIST')}
            className="nexus-focus rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="ALL">All statuses</option>
            <option value="REGISTERED">Registered</option>
            <option value="WAITLIST">Waitlist</option>
          </select>
          <select
            value={chatEventId}
            onChange={(e) => setChatEventId(e.target.value)}
            className="nexus-focus rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Select event chat</option>
            {Array.from(new Map(registrations.map((r) => [r.eventId, r.event])).values()).map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>
        </div>

        {/* Registrations table with premium styling */}
        <div className="nexus-card rounded-2xl p-6">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Recent Registrations</h2>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-3 text-left text-xs font-semibold uppercase tracking-wide">Event</th>
                <th className="py-3 text-left text-xs font-semibold uppercase tracking-wide">User</th>
                <th className="py-3 text-left text-xs font-semibold uppercase tracking-wide">Status</th>
                <th className="py-3 text-left text-xs font-semibold uppercase tracking-wide">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {registrations
                .filter((reg) => {
                  const text = `${reg.event.name} ${reg.user.name}`.toLowerCase();
                  const matchesSearch = text.includes(search.toLowerCase());
                  const matchesStatus = statusFilter === 'ALL' || reg.status === statusFilter;
                  return matchesSearch && matchesStatus;
                })
                .slice(0, 20)
                .map((reg, idx) => (
                <tr key={reg.id} className={`border-b border-slate-100 transition hover:bg-blue-50/40 ${idx % 2 ? 'bg-white' : 'bg-slate-50/40'}`}>
                  <td className="py-3 text-sm text-slate-800">{reg.event.name}</td>
                  <td className="py-3 text-sm text-slate-800">{reg.user.name}</td>
                  <td className="py-3">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{reg.status}</span>
                  </td>
                  <td className="py-3">
                    {reg.attendance ? (
                      <span className="text-green-600 text-sm">Checked in</span>
                    ) : (
                      <button
                        onClick={() => markAttendance(reg.id)}
                        className="rounded-lg bg-[var(--primary)] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:scale-[1.02] hover:bg-[var(--primary-dark)]"
                      >
                        Mark
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        {/* Chat window prioritized for coordinator operations */}
        {chatEventId ? (
          <div className="mt-8">
            <ChatWindow eventId={chatEventId} />
          </div>
        ) : null}
        </div>
      <Toaster />
      <Footer />
    </div>
  );
}