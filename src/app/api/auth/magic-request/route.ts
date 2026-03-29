import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sendMagicLink } from '@/lib/email';

/**
 * Passwordless: send a one-time link (OTP in URL) to the email.
 * - Existing user → login link.
 * - New user → requires `name`; creates STUDENT with no password until verified.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const otp = Math.random().toString(36).substring(2, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { otp, otpExpiry },
      });
      await sendMagicLink(normalizedEmail, otp);
      return NextResponse.json({ message: 'Magic link sent' });
    }

    const displayName = typeof name === 'string' ? name.trim() : '';
    if (!displayName) {
      return NextResponse.json(
        { error: 'No account for this email. Enter your name below to create one, or use Login if you already registered.' },
        { status: 400 }
      );
    }

    try {
      await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: displayName,
          role: 'STUDENT',
          password: null,
          otp,
          otpExpiry,
          isVerified: false,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return NextResponse.json({ error: 'An account with this email already exists. Use Login instead.' }, { status: 400 });
      }
      throw e;
    }
    await sendMagicLink(normalizedEmail, otp);
    return NextResponse.json({ message: 'Magic link sent' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
