import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { isParticipantRole } from '@/lib/roles';
import { promoteNextWaitlistedUser } from '@/lib/waitlist';

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

    const wasRegistered = registration.status === 'REGISTERED';

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
