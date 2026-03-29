import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyToken } from '@/lib/auth';
import type { Prisma } from '@prisma/client';

const COORD_ROLES = ['FACULTY_COORDINATOR', 'STUDENT_COORDINATOR', 'EVENT_COORDINATOR'] as const;

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const user = token ? verifyToken(token) : null;
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as {
      email?: string;
      name?: string;
      password?: string;
      role?: string;
    };

    if (!body.email?.trim() || !body.name?.trim() || !body.password?.trim()) {
      return NextResponse.json({ error: 'email, name, password required' }, { status: 400 });
    }

    if (!body.role || !COORD_ROLES.includes(body.role as (typeof COORD_ROLES)[number])) {
      return NextResponse.json({ error: 'role must be a coordinator type' }, { status: 400 });
    }

    const email = body.email.trim().toLowerCase();
    const taken = await prisma.user.findUnique({ where: { email } });
    if (taken) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
    }

    const hashed = await hashPassword(body.password);
    const created = await prisma.user.create({
      data: {
        email,
        name: body.name.trim(),
        password: hashed,
        role: body.role,
        isVerified: true,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    return NextResponse.json(created);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const user = token ? verifyToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    const allowedRoles = [
      'ADMIN',
      'EVENT_COORDINATOR',
      'FACULTY_COORDINATOR',
      'STUDENT_COORDINATOR',
      'STUDENT',
      'PARTICIPANT',
    ] as const;
    const parsedRole =
      role && allowedRoles.includes(role as (typeof allowedRoles)[number]) ? (role as (typeof allowedRoles)[number]) : undefined;
    const where: Prisma.UserWhereInput = parsedRole ? { role: parsedRole } : {};

    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
