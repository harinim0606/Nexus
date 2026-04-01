import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/lib/auth';
import { toSessionUser } from '@/lib/authSession';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    const user = await prisma.user.findFirst({
      where: {
        otp: token,
        otpExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { otp: null, otpExpiry: null, isVerified: true },
      select: { id: true, email: true, name: true, role: true, isVerified: true },
    });

    const jwtToken = generateToken({ ...updated, isVerified: true });
    const response = NextResponse.json({ user: toSessionUser(updated), token: jwtToken });
    response.cookies.set('token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}