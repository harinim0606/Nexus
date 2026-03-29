import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

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

    if (user.role === 'STUDENT') {
      totalRegistrations = await prisma.registration.count({ where: { userId: user.id } });
      const studentRegs = await prisma.registration.findMany({
        where: { userId: user.id },
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
    } else if (user.role === 'STUDENT_COORDINATOR') {
      const assigned = await prisma.event.findMany({
        where: { coordinatorId: user.id, isActive: true },
        select: { id: true },
      });
      const assignedIds = assigned.map((e) => e.id);
      totalRegistrations = await prisma.registration.count({ where: { eventId: { in: assignedIds } } });
      upcomingEvents = await prisma.event.count({
        where: { id: { in: assignedIds }, date: { gte: new Date() }, isActive: true },
      });
      attendance = await prisma.attendance.count({
        where: { registration: { eventId: { in: assignedIds } } },
      });
    } else {
      totalRegistrations = await prisma.registration.count();
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