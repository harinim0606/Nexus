import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { isParticipantRole } from '@/lib/roles';
import { promoteNextWaitlistedUser } from '@/lib/waitlist';
import { CONFIRMED, WAITLISTED } from '@/lib/registrationStatus';
import { sendSeatConfirmedFromWaitlistEmail } from '@/lib/email';
import { persistQrAndGetDataUrl } from '@/lib/registrationQr';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;
    const user = token ? verifyToken(token) : null;
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as { action?: string };
    if (body.action !== 'promote_from_waitlist') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const registration = await prisma.registration.findUnique({
      where: { id },
      include: { event: true, user: true },
    });
    if (!registration) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (registration.status !== WAITLISTED) {
      return NextResponse.json({ error: 'Registration is not waitlisted' }, { status: 400 });
    }

    const event = registration.event;
    if (!event.maxParticipants) {
      return NextResponse.json({ error: 'Event has no seat cap' }, { status: 400 });
    }
    const confirmed = await prisma.registration.count({
      where: { eventId: event.id, status: CONFIRMED },
    });
    if (confirmed >= event.maxParticipants) {
      return NextResponse.json({ error: 'No free seats' }, { status: 400 });
    }

    await persistQrAndGetDataUrl(prisma, registration.id, event);
    const updated = await prisma.registration.update({
      where: { id },
      data: { status: CONFIRMED, waitlistPosition: null },
      include: { user: true, event: true },
    });
    await sendSeatConfirmedFromWaitlistEmail(updated.user.email, {
      name: updated.event.name,
      date: updated.event.date,
      time: updated.event.time,
      venue: updated.event.venue,
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;
    const user = token ? verifyToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const registration = await prisma.registration.findUnique({
      where: { id },
      include: { event: true },
    });

    if (!registration) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const isOwner = registration.userId === user.id;
    const isAdmin = user.role === 'ADMIN';
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!isParticipantRole(user.role) && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (registration.status === 'CANCELLED') {
      return NextResponse.json({ ok: true });
    }

    const wasRegistered = registration.status === CONFIRMED;

    await prisma.registration.update({
      where: { id },
      data: { status: 'CANCELLED', qrCode: null, waitlistPosition: null },
    });

    if (wasRegistered) {
      await promoteNextWaitlistedUser(prisma, registration.eventId);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
