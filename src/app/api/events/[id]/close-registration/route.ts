import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { canManageEvent } from '@/lib/roles';

function mapUserRoleToClosedByRole(role: string): 'ADMIN' | 'FACULTY' | 'STUDENT' | null {
  if (role === 'ADMIN') return 'ADMIN';
  if (role === 'FACULTY_COORDINATOR' || role === 'EVENT_COORDINATOR') return 'FACULTY';
  if (role === 'STUDENT_COORDINATOR') return 'STUDENT';
  return null;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get('token')?.value;
    const user = token ? verifyToken(token) : null;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: eventId } = await context.params;
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, coordinatorId: true, studentCoordinatorId: true, isActive: true },
    });
    if (!event || !event.isActive) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const isManager = canManageEvent(user.role, event.coordinatorId, event.studentCoordinatorId, user.id);
    if (!isManager) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const closedByRole = mapUserRoleToClosedByRole(user.role);
    if (!closedByRole) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        registrationStatus: 'CLOSED',
        closedByRole,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

