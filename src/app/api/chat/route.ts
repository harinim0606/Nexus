import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { userCanAccessEventChat } from '@/lib/chatAccess';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const user = token ? verifyToken(token) : null;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const eventId = new URL(request.url).searchParams.get('eventId');
    if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 });

    if (!(await userCanAccessEventChat(user, eventId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rows = await prisma.chatMessage.findMany({
      where: { eventId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { timestamp: 'asc' },
      take: 100,
    });

    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const user = token ? verifyToken(token) : null;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { eventId, message } = (await request.json()) as { eventId: string; message: string };
    if (!eventId || !message?.trim()) {
      return NextResponse.json({ error: 'eventId and message are required' }, { status: 400 });
    }

    if (!(await userCanAccessEventChat(user, eventId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const created = await prisma.chatMessage.create({
      data: {
        eventId,
        userId: user.id,
        message: message.trim(),
      },
      include: { user: { select: { id: true, name: true } } },
    });

    return NextResponse.json(created);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

