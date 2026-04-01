import type { PrismaClient } from '@prisma/client';
import { sendWaitlistApologyEmail } from '@/lib/email';
import { parseEventStartEnd } from '@/lib/schedule';
import { fillSeatsFromWaitlist } from '@/lib/waitlist';
import { DECLINED, WAITLISTED } from '@/lib/registrationStatus';

/**
 * For each active event past the "24h before start" mark, promote waitlist then decline leftovers once.
 */
export async function runWaitlistFinalizationJob(prisma: PrismaClient) {
  const now = new Date();
  const events = await prisma.event.findMany({
    where: {
      isActive: true,
      waitlistFinalizedAt: null,
      maxParticipants: { not: null },
    },
  });

  let processed = 0;
  for (const event of events) {
    const range = parseEventStartEnd(event.date, event.time);
    if (!range) continue;

    const cutoff = new Date(range.start.getTime() - 24 * 60 * 60 * 1000);
    if (now < cutoff) continue;

    const locked = await prisma.event.updateMany({
      where: { id: event.id, waitlistFinalizedAt: null },
      data: { waitlistFinalizedAt: now },
    });
    if (locked.count === 0) continue;

    await fillSeatsFromWaitlist(prisma, event.id);

    const leftovers = await prisma.registration.findMany({
      where: { eventId: event.id, status: WAITLISTED },
      include: { user: true, event: true },
    });

    for (const r of leftovers) {
      await prisma.registration.update({
        where: { id: r.id },
        data: { status: DECLINED, waitlistPosition: null },
      });
      await sendWaitlistApologyEmail(r.user.email, {
        name: r.event.name,
        date: r.event.date,
        time: r.event.time,
        venue: r.event.venue,
      });
    }

    processed += 1;
  }

  return { processedEvents: processed };
}
