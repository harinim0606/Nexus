'use client';

import { useEffect, useState } from 'react';
import type { EventType, RegistrationParticipantDetails, TeamRosterRow } from '@/types';

interface RegistrationFormProps {
  eventId: string;
  eventType: EventType;
  onSubmit: (participantDetails: RegistrationParticipantDetails) => void;
}

const inputCls = 'nexus-focus w-full rounded-xl border px-3 py-2 text-sm';

const emptyRosterMember = (): TeamRosterRow => ({ name: '', email: '', phone: '' });

export default function RegistrationForm({ eventId: _eventId, eventType, onSubmit }: RegistrationFormProps) {
  const [accountEmail, setAccountEmail] = useState('');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [department, setDepartment] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [gender, setGender] = useState('');

  const [teamName, setTeamName] = useState('');
  const [teamCollegeName, setTeamCollegeName] = useState('');
  const [teamDepartment, setTeamDepartment] = useState('');
  const [leaderName, setLeaderName] = useState('');
  const [leaderEmail, setLeaderEmail] = useState('');
  const [leaderPhone, setLeaderPhone] = useState('');
  const [members, setMembers] = useState<TeamRosterRow[]>([emptyRosterMember()]);

  useEffect(() => {
    void fetch('/api/auth/me', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d: { user?: { email?: string; name?: string } | null }) => {
        const em = d.user?.email ?? '';
        setAccountEmail(em);
        setEmail(em);
        setLeaderEmail(em);
        if (d.user?.name) setLeaderName(d.user.name);
      })
      .catch(() => {});
  }, []);

  const addMember = () => setMembers([...members, emptyRosterMember()]);
  const updateMember = (i: number, patch: Partial<TeamRosterRow>) => {
    const next = [...members];
    next[i] = { ...next[i], ...patch };
    setMembers(next);
  };
  const removeMember = (i: number) => {
    if (members.length <= 1) return;
    setMembers(members.filter((_, idx) => idx !== i));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (eventType === 'INDIVIDUAL') {
      onSubmit({
        kind: 'individual',
        fullName: fullName.trim(),
        email: (email.trim() || accountEmail).toLowerCase(),
        phone: phone.trim(),
        collegeName: collegeName.trim(),
        department: department.trim(),
        yearOfStudy: yearOfStudy.trim(),
        gender: gender.trim(),
      });
      return;
    }

    const roster = members
      .map((m) => ({
        name: m.name.trim(),
        email: m.email.trim().toLowerCase(),
        phone: m.phone.trim(),
      }))
      .filter((m) => m.name.length > 0);

    onSubmit({
      kind: 'team',
      teamName: teamName.trim(),
      teamCollegeName: teamCollegeName.trim(),
      teamDepartment: teamDepartment.trim(),
      leaderName: leaderName.trim(),
      leaderEmail: (leaderEmail.trim() || accountEmail).toLowerCase(),
      leaderPhone: leaderPhone.trim(),
      members: roster,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
      {eventType === 'INDIVIDUAL' ? (
        <>
          <p className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
            <strong className="text-slate-800 dark:text-slate-200">Individual event</strong> — details are used for your
            entry pass and certificate.
          </p>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Full name</label>
            <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Email</label>
            <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</label>
            <input type="tel" className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">College name</label>
            <input className={inputCls} value={collegeName} onChange={(e) => setCollegeName(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Department</label>
            <input className={inputCls} value={department} onChange={(e) => setDepartment(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Year of study</label>
            <input
              className={inputCls}
              placeholder="e.g. 2nd Year"
              value={yearOfStudy}
              onChange={(e) => setYearOfStudy(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Gender</label>
            <select className={inputCls} value={gender} onChange={(e) => setGender(e.target.value)} required>
              <option value="">Select</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Non-binary">Non-binary</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>
        </>
      ) : (
        <>
          <p className="rounded-xl border border-indigo-200/60 bg-indigo-50/50 px-3 py-2 text-sm text-slate-600 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-slate-400">
            <strong className="text-slate-800 dark:text-slate-200">Team event</strong> — one submission per team. Add all
            members; roster is stored for organizers and certificates.
          </p>

          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Team info</h3>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Team name</label>
            <input className={inputCls} value={teamName} onChange={(e) => setTeamName(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">College name</label>
            <input className={inputCls} value={teamCollegeName} onChange={(e) => setTeamCollegeName(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Department</label>
            <input className={inputCls} value={teamDepartment} onChange={(e) => setTeamDepartment(e.target.value)} required />
          </div>

          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Team leader</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className={inputCls}
              placeholder="Leader name"
              value={leaderName}
              onChange={(e) => setLeaderName(e.target.value)}
              required
            />
            <input
              type="email"
              className={inputCls}
              placeholder="Leader email"
              value={leaderEmail}
              onChange={(e) => setLeaderEmail(e.target.value)}
              required
            />
            <input
              type="tel"
              className={inputCls}
              placeholder="Leader phone"
              value={leaderPhone}
              onChange={(e) => setLeaderPhone(e.target.value)}
              required
            />
          </div>

          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Team members</h3>
          {members.map((m, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200/80 p-3 dark:border-slate-700"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Member {i + 1}</span>
                {members.length > 1 ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-red-600"
                    onClick={() => removeMember(i)}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  className={inputCls}
                  placeholder="Name"
                  value={m.name}
                  onChange={(e) => updateMember(i, { name: e.target.value })}
                />
                <input
                  type="email"
                  className={inputCls}
                  placeholder="Email"
                  value={m.email}
                  onChange={(e) => updateMember(i, { email: e.target.value })}
                />
                <input
                  type="tel"
                  className={inputCls}
                  placeholder="Phone"
                  value={m.phone}
                  onChange={(e) => updateMember(i, { phone: e.target.value })}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addMember}
            className="text-sm font-semibold text-indigo-600 dark:text-indigo-400"
          >
            + Add member
          </button>
        </>
      )}
      <button
        type="submit"
        className="w-full rounded-xl bg-[var(--primary)] py-2.5 text-sm font-semibold text-white transition duration-200 hover:scale-[1.02] hover:bg-[var(--primary-dark)]"
      >
        Register
      </button>
    </form>
  );
}
