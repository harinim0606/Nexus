import type { Role } from '@/types';

export function roleHomePath(role?: Role | string | null) {
  if (role === 'ADMIN') return '/event-management';

  if (
    role === 'FACULTY_COORDINATOR' ||
    role === 'EVENT_COORDINATOR' ||
    role === 'STUDENT_COORDINATOR'
  ) {
    return '/dashboard/coordinator';
  }

  // STUDENT, PARTICIPANT, or unknown → participant hub
  return '/dashboard/student';
}

