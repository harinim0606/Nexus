import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendSignupOtpEmail } from '@/lib/email';

function sixDigitCode() {
  return String(100000 + Math.floor(Math.random() * 900000));
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'No account found' }, { status: 404 });
    }
    if (user.isVerified) {
      return NextResponse.json({ error: 'Account already verified' }, { status: 400 });
    }

    const code = sixDigitCode();
    const emailVerifyExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifyCode: code, emailVerifyExpiresAt },
    });

    await sendSignupOtpEmail(email, code);
    return NextResponse.json({ message: 'New code sent' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
