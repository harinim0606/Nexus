import { prisma } from '@/lib/prisma';
import { isParticipantRole } from '@/lib/roles';

export async function userCanAccessEventChat(user: { id: string; role: string }, eventId: string) {
  if (user.role === 'ADMIN') return true;

  const event = await prisma.event.findFirst({ where: { id: eventId, isActive: true } });
  if (!event) return false;

  if (
    user.role === 'FACULTY_COORDINATOR' ||
    user.role === 'STUDENT_COORDINATOR' ||
    user.role === 'EVENT_COORDINATOR'
  ) {
    return event.coordinatorId === user.id || event.studentCoordinatorId === user.id;
  }

  if (isParticipantRole(user.role)) {
    const reg = await prisma.registration.findFirst({
      where: {
        eventId,
        userId: user.id,
        status: { in: ['REGISTERED', 'WAITLIST'] },
      },
    });
    return !!reg;
  }

  return false;
}
