'use client';

import { useState } from 'react';
import { EventType, TeamMember } from '@/types';

interface RegistrationFormProps {
  eventId: string;
  eventType: EventType;
  onSubmit: (data: { teamName?: string; teamMembers?: TeamMember[]; memberEmails?: string[] }) => void;
}

export default function RegistrationForm({ eventId: _eventId, eventType, onSubmit }: RegistrationFormProps) {
  const [teamName, setTeamName] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([{ name: '' }]);
  const [memberEmails, setMemberEmails] = useState<string[]>(['']);

  const addMember = () => {
    setTeamMembers([...teamMembers, { name: '' }]);
    setMemberEmails([...memberEmails, '']);
  };

  const updateMember = (index: number, value: string) => {
    const updated = [...teamMembers];
    updated[index] = { ...updated[index], name: value };
    setTeamMembers(updated);
  };

  const updateEmail = (index: number, value: string) => {
    const next = [...memberEmails];
    next[index] = value;
    setMemberEmails(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedNames =
      eventType === 'TEAM'
        ? teamMembers.map((m) => m.name.trim()).filter(Boolean)
        : [];

    const emails =
      eventType === 'TEAM'
        ? memberEmails
            .map((x) => x.trim())
            .filter(Boolean)
            .slice(0, normalizedNames.length)
        : [];

    onSubmit({
      teamName: eventType === 'TEAM' ? teamName.trim() : undefined,
      teamMembers:
        normalizedNames.length > 0 ? normalizedNames.map((name) => ({ name })) : undefined,
      memberEmails: emails.length ? emails : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {eventType === 'INDIVIDUAL' ? (
        <p className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
          <strong className="text-slate-800 dark:text-slate-200">Individual event</strong> — single registration form. You
          register once as the participant.
        </p>
      ) : null}
      {eventType === 'TEAM' && (
        <>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Team name</label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="nexus-focus w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
              required
            />
          </div>
          <p className="rounded-xl border border-indigo-200/60 bg-indigo-50/50 px-3 py-2 text-sm text-slate-600 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-slate-400">
            <strong className="text-slate-800 dark:text-slate-200">Team event</strong> — the team leader registers once.
            Add member names and optional emails; duplicate emails across teams are blocked.
          </p>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Team members</h3>
            {teamMembers.map((member, index) => (
              <div key={index} className="mb-2 grid gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder={`Member ${index + 1} name`}
                  value={member.name}
                  onChange={(e) => updateMember(index, e.target.value)}
                  className="nexus-focus rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                  required
                />
                <input
                  type="email"
                  placeholder={`Member ${index + 1} email (optional)`}
                  value={memberEmails[index] ?? ''}
                  onChange={(e) => updateEmail(index, e.target.value)}
                  className="nexus-focus rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={addMember}
              className="text-sm font-semibold text-indigo-600 transition hover:text-indigo-800 dark:text-indigo-400"
            >
              + Add member
            </button>
          </div>
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
