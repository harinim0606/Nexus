import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/lib/auth';
import { toSessionUser } from '@/lib/authSession';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string; code?: string };
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    if (!email || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Email and 6-digit code required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.emailVerifyCode || !user.emailVerifyExpiresAt) {
      return NextResponse.json({ error: 'No verification pending for this email' }, { status: 400 });
    }
    if (user.emailVerifyExpiresAt < new Date()) {
      return NextResponse.json({ error: 'Code expired. Request a new one.' }, { status: 400 });
    }
    if (user.emailVerifyCode !== code) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        emailVerifyCode: null,
        emailVerifyExpiresAt: null,
        otp: null,
        otpExpiry: null,
      },
      select: { id: true, email: true, name: true, role: true, isVerified: true },
    });

    const jwtToken = generateToken(updated);
    const response = NextResponse.json({ user: toSessionUser(updated), token: jwtToken });
    response.cookies.set('token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
