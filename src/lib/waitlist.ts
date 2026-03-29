import type { PrismaClient } from '@prisma/client';
import { sendWaitlistPromotionEmail } from '@/lib/email';

export async function promoteNextWaitlistedUser(prisma: PrismaClient, eventId: string) {
  const next = await prisma.registration.findFirst({
    where: { eventId, status: 'WAITLIST' },
    orderBy: [{ waitlistPosition: 'asc' }, { createdAt: 'asc' }],
    include: { user: true, event: true },
  });

  if (!next) return null;

  const updated = await prisma.registration.update({
    where: { id: next.id },
    data: { status: 'REGISTERED', waitlistPosition: null },
    include: { user: true, event: true },
  });

  await sendWaitlistPromotionEmail(updated.user.email, updated.event.name);

  return updated;
}
