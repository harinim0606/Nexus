import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { canManageEvent } from '@/lib/roles';
import { sendAnnouncementEmail } from '@/lib/email';

function appOrigin() {
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;
    const user = token ? verifyToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: eventId } = await context.params;
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (!canManageEvent(user.role, event.coordinatorId, event.studentCoordinatorId, user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const template = await prisma.certificateTemplate.findUnique({ where: { eventId } });
    const snapshot = template?.templateData ?? JSON.stringify({ layout: 'default', eventName: event.name });

    const attendees = await prisma.registration.findMany({
      where: { eventId, status: 'CONFIRMED' },
      select: { userId: true, user: { select: { email: true, name: true } } },
    });

    let created = 0;
    for (const row of attendees) {
      const exists = await prisma.certificate.findFirst({
        where: { eventId, userId: row.userId },
      });
      if (exists) continue;
      const cert = await prisma.certificate.create({
        data: { eventId, userId: row.userId, template: snapshot },
      });
      const dl = `${appOrigin()}/api/certificates/${cert.id}/download`;
      await sendAnnouncementEmail(
        row.user.email,
        `Your certificate — ${event.name}`,
        `Hi ${row.user.name},\n\nYour certificate for "${event.name}" is ready.\n\nDownload (while signed in): ${dl}\n\nOr open your NEXUS dashboard → Certificates.\n`
      );
      created += 1;
    }

    return NextResponse.json({ issued: created, skipped: attendees.length - created });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
