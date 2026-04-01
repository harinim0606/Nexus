import type { PrismaClient } from '@prisma/client';
import { sendSeatConfirmedFromWaitlistEmail } from '@/lib/email';
import { persistQrAndGetDataUrl } from '@/lib/registrationQr';
import { CONFIRMED, WAITLISTED } from '@/lib/registrationStatus';

export async function promoteNextWaitlistedUser(prisma: PrismaClient, eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event?.maxParticipants) return null;

  const confirmed = await prisma.registration.count({
    where: { eventId, status: CONFIRMED },
  });
  if (confirmed >= event.maxParticipants) return null;

  const next = await prisma.registration.findFirst({
    where: { eventId, status: WAITLISTED },
    orderBy: [{ waitlistPosition: 'asc' }, { createdAt: 'asc' }],
    include: { user: true, event: true },
  });

  if (!next) return null;

  await persistQrAndGetDataUrl(prisma, next.id, event);

  const updated = await prisma.registration.update({
    where: { id: next.id },
    data: { status: CONFIRMED, waitlistPosition: null },
    include: { user: true, event: true },
  });

  await sendSeatConfirmedFromWaitlistEmail(updated.user.email, {
    name: updated.event.name,
    date: updated.event.date,
    time: updated.event.time,
    venue: updated.event.venue,
  });

  return updated;
}

/** Promote waitlisted users until seats full or waitlist empty. */
export async function fillSeatsFromWaitlist(prisma: PrismaClient, eventId: string) {
  let n = 0;
  for (;;) {
    const r = await promoteNextWaitlistedUser(prisma, eventId);
    if (!r) break;
    n += 1;
  }
  return n;
}
