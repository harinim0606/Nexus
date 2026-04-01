import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sendMagicLink, sendSignupOtpEmail } from '@/lib/email';
import { createMagicLoginToken } from '@/lib/magicToken';

function sixDigitCode() {
  return String(100000 + Math.floor(Math.random() * 900000));
}

const MAGIC_LINK_MS = 15 * 60 * 1000;

/**
 * - Existing user → secure magic login link (15 min).
 * - New user → requires `name`; sends 6-digit email OTP (dashboard blocked until verified).
 */
export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const otp = createMagicLoginToken();
    const otpExpiry = new Date(Date.now() + MAGIC_LINK_MS);

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
        {
          error:
            'No account for this email. Enter your name below to create one, or use Login if you already registered.',
        },
        { status: 400 }
      );
    }

    const code = sixDigitCode();
    const emailVerifyExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

    try {
      await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: displayName,
          role: 'STUDENT',
          password: null,
          isVerified: false,
          emailVerifyCode: code,
          emailVerifyExpiresAt,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return NextResponse.json(
          { error: 'An account with this email already exists. Use Login instead.' },
          { status: 400 }
        );
      }
      throw e;
    }
    await sendSignupOtpEmail(normalizedEmail, code);
    return NextResponse.json({ message: 'Verification code sent', needsEmailVerification: true });
  } catch (e) {
    console.error('magic-request', e);
    const msg = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: msg.includes('not configured') ? msg : 'Internal server error' }, { status: 500 });
  }
}
