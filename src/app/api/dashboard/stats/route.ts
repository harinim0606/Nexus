import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { isCoordinatorRole, isParticipantRole } from '@/lib/roles';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const user = token ? verifyToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let totalRegistrations = 0;
    let upcomingEvents = 0;
    let attendance = 0;

    if (isParticipantRole(user.role)) {
      totalRegistrations = await prisma.registration.count({
        where: { userId: user.id, status: { not: 'CANCELLED' } },
      });
      const studentRegs = await prisma.registration.findMany({
        where: { userId: user.id, status: { not: 'CANCELLED' } },
        select: { eventId: true },
      });
      const eventIds = studentRegs.map((r) => r.eventId);
      upcomingEvents = await prisma.event.count({
        where: {
          id: { in: eventIds },
          date: { gte: new Date() },
          isActive: true,
        },
      });
      attendance = await prisma.attendance.count({
        where: { registration: { userId: user.id } },
      });
    } else if (isCoordinatorRole(user.role) && user.role !== 'ADMIN') {
      const assigned = await prisma.event.findMany({
        where: {
          isActive: true,
          OR: [{ coordinatorId: user.id }, { studentCoordinatorId: user.id }],
        },
        select: { id: true },
      });
      const assignedIds = assigned.map((e) => e.id);
      totalRegistrations = await prisma.registration.count({
        where: { eventId: { in: assignedIds }, status: { not: 'CANCELLED' } },
      });
      upcomingEvents = await prisma.event.count({
        where: { id: { in: assignedIds }, date: { gte: new Date() }, isActive: true },
      });
      attendance = await prisma.attendance.count({
        where: { registration: { eventId: { in: assignedIds } } },
      });
    } else {
      totalRegistrations = await prisma.registration.count({ where: { status: { not: 'CANCELLED' } } });
      upcomingEvents = await prisma.event.count({
        where: {
          date: { gte: new Date() },
          isActive: true,
        },
      });
      attendance = await prisma.attendance.count();
    }

    return NextResponse.json({
      totalRegistrations,
      upcomingEvents,
      attendance,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
