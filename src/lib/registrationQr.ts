import type { PrismaClient } from '@prisma/client';
import { generateQR } from '@/lib/qr';
import { parseEventStartEnd } from '@/lib/schedule';

export function buildQrToken(registrationId: string, event: { date: Date; time: string }): string {
  const range = parseEventStartEnd(event.date, event.time);
  const ts = range ? range.start.getTime() : 0;
  return `nexus:${registrationId}:${ts}`;
}

export async function persistQrAndGetDataUrl(
  prisma: PrismaClient,
  registrationId: string,
  event: { date: Date; time: string }
): Promise<{ token: string; qrDataUrl: string }> {
  const token = buildQrToken(registrationId, event);
  await prisma.registration.update({
    where: { id: registrationId },
    data: { qrCode: token },
  });
  const qrDataUrl = await generateQR(token);
  return { token, qrDataUrl };
}
