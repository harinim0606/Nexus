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

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    const allowedRoles = [
      'ADMIN',
      'EVENT_COORDINATOR',
      'FACULTY_COORDINATOR',
      'STUDENT_COORDINATOR',
      'STUDENT',
    ] as const;
    const parsedRole =
      role && allowedRoles.includes(role as (typeof allowedRoles)[number]) ? (role as (typeof allowedRoles)[number]) : undefined;
    const where: any = parsedRole ? { role: parsedRole } : {};

    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true },
    });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}