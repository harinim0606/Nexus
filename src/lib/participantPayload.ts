import type { EventType } from '@/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[\d+][\d\s\-().]{6,}$/;

export type TeamRosterMember = {
  name: string;
  email: string;
  phone: string;
};

export type IndividualParticipantPayload = {
  kind: 'individual';
  fullName: string;
  email: string;
  phone: string;
  collegeName: string;
  department: string;
  yearOfStudy: string;
  gender: string;
};

export type TeamParticipantPayload = {
  kind: 'team';
  teamName: string;
  teamCollegeName: string;
  teamDepartment: string;
  leaderName: string;
  leaderEmail: string;
  leaderPhone: string;
  members: TeamRosterMember[];
};

export type ParticipantPayload = IndividualParticipantPayload | TeamParticipantPayload;

function nonEmpty(s: unknown): string | null {
  if (typeof s !== 'string') return null;
  const t = s.trim();
  return t.length ? t : null;
}

function validEmail(s: string): boolean {
  return EMAIL_RE.test(s.trim());
}

function validPhone(s: string): boolean {
  const d = s.replace(/\D/g, '');
  return PHONE_RE.test(s.trim()) && d.length >= 7;
}

export type ParseOptions = {
  maxParticipants?: number | null;
};

export function parseParticipantPayload(
  raw: unknown,
  eventType: EventType,
  accountEmail: string,
  options?: ParseOptions
): { ok: true; payload: ParticipantPayload } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Registration details required' };
  }
  const o = raw as Record<string, unknown>;

  if (eventType === 'INDIVIDUAL') {
    const fullName = nonEmpty(o.fullName);
    const email = (nonEmpty(o.email) ?? accountEmail).toLowerCase();
    const phone = nonEmpty(o.phone);
    const collegeName = nonEmpty(o.collegeName);
    const department = nonEmpty(o.department);
    const yearOfStudy = nonEmpty(o.yearOfStudy);
    const gender = nonEmpty(o.gender);
    if (!fullName || !phone || !collegeName || !department || !yearOfStudy || !gender) {
      return { ok: false, error: 'Please complete all individual registration fields' };
    }
    if (!validEmail(email)) return { ok: false, error: 'Please enter a valid email address' };
    if (!validPhone(phone)) return { ok: false, error: 'Please enter a valid phone number' };
    return {
      ok: true,
      payload: {
        kind: 'individual',
        fullName,
        email,
        phone,
        collegeName,
        department,
        yearOfStudy,
        gender,
      },
    };
  }

  const teamName = nonEmpty(o.teamName);
  const teamCollegeName = nonEmpty(o.teamCollegeName);
  const teamDepartment = nonEmpty(o.teamDepartment);
  const leaderName = nonEmpty(o.leaderName);
  const leaderEmail = (nonEmpty(o.leaderEmail) ?? accountEmail).toLowerCase();
  const leaderPhone = nonEmpty(o.leaderPhone);

  if (!teamName || !teamCollegeName || !teamDepartment || !leaderName || !leaderEmail || !leaderPhone) {
    return { ok: false, error: 'Please complete all team and leader fields' };
  }
  if (!validEmail(leaderEmail)) return { ok: false, error: 'Leader: invalid email' };
  if (!validPhone(leaderPhone)) return { ok: false, error: 'Leader: invalid phone number' };

  const members: TeamRosterMember[] = [];
  const membersRaw = o.members;
  if (Array.isArray(membersRaw)) {
    for (const row of membersRaw) {
      if (!row || typeof row !== 'object') continue;
      const m = row as Record<string, unknown>;
      const name = nonEmpty(m.name);
      if (!name) continue;
      const email = nonEmpty(m.email);
      const phone = nonEmpty(m.phone);
      if (!email || !phone) {
        return { ok: false, error: 'Each team member needs name, email, and phone' };
      }
      if (!validEmail(email)) return { ok: false, error: `Member "${name}": invalid email` };
      if (!validPhone(phone)) return { ok: false, error: `Member "${name}": invalid phone` };
      members.push({ name, email: email.toLowerCase(), phone });
    }
  }

  const max = options?.maxParticipants;
  if (max != null && max > 0 && 1 + members.length > max) {
    return {
      ok: false,
      error: `Team size (leader + members) cannot exceed the event limit of ${max} participants`,
    };
  }

  return {
    ok: true,
    payload: {
      kind: 'team',
      teamName,
      teamCollegeName,
      teamDepartment,
      leaderName,
      leaderEmail,
      leaderPhone,
      members,
    },
  };
}

export function collectEmailsFromPayload(payload: ParticipantPayload): Set<string> {
  const emails = new Set<string>();
  if (payload.kind === 'individual') {
    emails.add(payload.email.toLowerCase());
    return emails;
  }
  emails.add(payload.leaderEmail.toLowerCase());
  for (const m of payload.members) {
    if (m.email) emails.add(m.email.toLowerCase());
  }
  return emails;
}

export function rosterEmailsForDb(payload: ParticipantPayload): string[] {
  if (payload.kind === 'individual') return [];
  return [payload.leaderEmail, ...payload.members.map((m) => m.email)].map((e) => e.toLowerCase());
}
