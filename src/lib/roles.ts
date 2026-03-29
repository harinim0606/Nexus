export const PARTICIPANT_ROLES = ['STUDENT', 'PARTICIPANT'] as const;

export function isParticipantRole(role: string | undefined | null): boolean {
  return role === 'STUDENT' || role === 'PARTICIPANT';
}

export function isCoordinatorRole(role: string | undefined | null): boolean {
  return (
    role === 'FACULTY_COORDINATOR' ||
    role === 'STUDENT_COORDINATOR' ||
    role === 'EVENT_COORDINATOR'
  );
}

export function canManageEvent(
  role: string | undefined | null,
  facultyId: string,
  studentCoordId: string | null | undefined,
  userId: string
): boolean {
  if (role === 'ADMIN') return true;
  if (!isCoordinatorRole(role)) return false;
  return userId === facultyId || (!!studentCoordId && userId === studentCoordId);
}
