import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { sendSignupOtpEmail } from '@/lib/email';

function sixDigitCode() {
  return String(100000 + Math.floor(Math.random() * 900000));
}

/**
 * Password signup: creates an unverified student account and emails a 6-digit OTP.
 * User must POST /api/auth/verify-signup-otp before receiving a session cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const { email: rawEmail, password, name, role } = await request.json();
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    if (role && role !== 'STUDENT') {
      return NextResponse.json({ error: 'Role not allowed' }, { status: 403 });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    const code = sixDigitCode();
    const emailVerifyExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: typeof name === 'string' ? name.trim() : 'Student',
        role: 'STUDENT',
        isVerified: false,
        emailVerifyCode: code,
        emailVerifyExpiresAt,
      },
    });

    await sendSignupOtpEmail(email, code);
    return NextResponse.json({ message: 'Verification code sent', needsEmailVerification: true });
  } catch (e) {
    console.error('signup', e);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : '';
    return NextResponse.json(
      { error: msg.includes('not configured') ? msg : 'Internal server error' },
      { status: 500 }
    );
  }
}
