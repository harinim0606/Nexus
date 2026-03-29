'use client';

import { useState } from 'react';
import { EventType, TeamMember } from '@/types';

interface RegistrationFormProps {
  eventId: string;
  eventType: EventType;
  onSubmit: (data: { teamMembers?: TeamMember[] }) => void;
}

export default function RegistrationForm({ eventId: _eventId, eventType, onSubmit }: RegistrationFormProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([{ name: '' }]);

  const addMember = () => {
    setTeamMembers([...teamMembers, { name: '' }]);
  };

  const updateMember = (index: number, value: string) => {
    const updated = [...teamMembers];
    updated[index] = { ...updated[index], name: value };
    setTeamMembers(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedNames =
      eventType === 'TEAM' ? teamMembers.map((m) => m.name.trim()).filter(Boolean) : null;

    onSubmit({
      teamMembers: normalizedNames ? normalizedNames.map((name) => ({ name })) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {eventType === 'TEAM' && (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Team Members</h3>
          {teamMembers.map((member, index) => (
            <div key={index} className="flex space-x-2 mb-2">
              <input
                type="text"
                placeholder={`Member ${index + 1} name`}
                value={member.name}
                onChange={(e) => updateMember(index, e.target.value)}
                className="nexus-focus flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                required
              />
            </div>
          ))}
          <button
            type="button"
            onClick={addMember}
            className="text-sm font-semibold text-indigo-600 transition hover:scale-[1.02] hover:text-indigo-800"
          >
            + Add Member
          </button>
        </div>
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