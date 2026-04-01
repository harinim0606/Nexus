import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, generateToken } from '@/lib/auth';
import { sendMagicLink } from '@/lib/email';
import { toSessionUser } from '@/lib/authSession';
import { createMagicLoginToken } from '@/lib/magicToken';

const MAGIC_LINK_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const { email: rawEmail, password, isMagicLogin } = await request.json();
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (isMagicLogin) {
      const otp = createMagicLoginToken();
      const otpExpiry = new Date(Date.now() + MAGIC_LINK_MS);

      await prisma.user.update({
        where: { id: user.id },
        data: { otp, otpExpiry },
      });

      await sendMagicLink(email, otp);
      return NextResponse.json({ message: 'Magic link sent' });
    }

    if (!user.password) {
      return NextResponse.json({ error: 'Password not set' }, { status: 400 });
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    if ((user.role === 'STUDENT' || user.role === 'PARTICIPANT') && !user.isVerified) {
      return NextResponse.json(
        { error: 'Please verify your email before signing in with a password.' },
        { status: 403 }
      );
    }

    const token = generateToken(user);
    const response = NextResponse.json({ user: toSessionUser(user), token });
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return response;
  } catch (e) {
    console.error('login', e);
    const msg = e instanceof Error ? e.message : '';
    return NextResponse.json(
      { error: msg.includes('not configured') ? msg : 'Internal server error' },
      { status: 500 }
    );
  }
}
