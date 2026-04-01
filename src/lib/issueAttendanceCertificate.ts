import type { PrismaClient } from '@prisma/client';
import { buildCertificatePdf } from '@/lib/certificatePdf';
import { sendCertificateEmail } from '@/lib/email';

function participantDisplayName(reg: {
  user: { name: string };
  leaderName: string | null;
  teamName: string | null;
  participantDetails: string | null;
}): string {
  if (reg.leaderName?.trim()) {
    const ln = reg.leaderName.trim();
    return reg.teamName?.trim() ? `${reg.teamName.trim()} — ${ln}` : ln;
  }
  if (!reg.participantDetails?.trim()) return reg.user.name;
  try {
    const p = JSON.parse(reg.participantDetails) as {
      kind?: string;
      fullName?: string;
      teamName?: string;
      leaderName?: string;
      leader?: { name?: string };
    };
    if (p.kind === 'individual' && typeof p.fullName === 'string' && p.fullName.trim()) {
      return p.fullName.trim();
    }
    if (p.kind === 'team') {
      const leader = (typeof p.leaderName === 'string' ? p.leaderName : p.leader?.name)?.trim();
      if (leader) {
        return p.teamName?.trim() ? `${p.teamName.trim()} — ${leader}` : leader;
      }
    }
  } catch {
    /* ignore */
  }
  return reg.user.name;
}

export async function issueCertificateAfterAttendance(prisma: PrismaClient, registrationId: string) {
  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { user: true, event: true },
  });
  if (!reg) return;

  const existing = await prisma.certificate.findFirst({
    where: { eventId: reg.eventId, userId: reg.userId },
  });
  if (existing) return;

  const participantName = participantDisplayName(reg);
  const templateRow = await prisma.certificateTemplate.findUnique({ where: { eventId: reg.eventId } });
  const templateJson =
    templateRow?.templateData ??
    JSON.stringify({
      version: 1,
      width: 800,
      height: 600,
      fields: [
        { id: 'n', binding: 'participantName', x: 80, y: 280, fontSize: 22 },
        { id: 'e', binding: 'eventName', x: 80, y: 340, fontSize: 18 },
        { id: 'd', binding: 'issuedDate', x: 80, y: 400, fontSize: 14 },
      ],
    });

  const pdfBytes = await buildCertificatePdf(templateJson, {
    participantName,
    eventName: reg.event.name,
    email: reg.user.email,
    issuedDate: new Date().toLocaleDateString(),
  });

  const pdf = Buffer.from(pdfBytes);

  await prisma.certificate.create({
    data: {
      eventId: reg.eventId,
      userId: reg.userId,
      template: templateJson,
    },
  });

  await sendCertificateEmail(reg.user.email, reg.event.name, participantName, pdf);
}
