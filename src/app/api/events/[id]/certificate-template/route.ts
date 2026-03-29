import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { canManageEvent } from '@/lib/roles';

export async function GET(
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

    const tpl = await prisma.certificateTemplate.findUnique({ where: { eventId } });
    return NextResponse.json(tpl);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
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

    const { templateData } = (await request.json()) as { templateData?: string };
    if (!templateData || typeof templateData !== 'string') {
      return NextResponse.json({ error: 'templateData required' }, { status: 400 });
    }

    const tpl = await prisma.certificateTemplate.upsert({
      where: { eventId },
      create: { eventId, templateData },
      update: { templateData },
    });
    return NextResponse.json(tpl);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
