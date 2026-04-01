'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import AuthPageHeader from '@/components/AuthPageHeader';
import { redirectAfterSignIn } from '@/lib/authSession';

function VerifySignupInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const emailParam = searchParams.get('email') ?? '';
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailParam.trim().toLowerCase();
    if (!email || !/^\d{6}$/.test(code.trim())) {
      toast.error('Enter the email you used and the 6-digit code');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/verify-signup-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Verification failed');
        return;
      }
      toast.success('Email verified');
      redirectAfterSignIn(data?.user?.role);
    } catch {
      toast.error('Verification failed');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    const email = emailParam.trim().toLowerCase();
    if (!email) {
      toast.error('Email missing — go back to sign up');
      return;
    }
    const res = await fetch('/api/auth/resend-signup-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || 'Could not resend');
      return;
    }
    toast.success('New code sent');
  };

  return (
    <div className="nexus-card w-full max-w-md rounded-2xl p-8 shadow-xl">
      <h1 className="text-center text-2xl font-bold text-slate-900 dark:text-white">Verify your email</h1>
      <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
        Enter the 6-digit code we sent to <strong>{emailParam || 'your inbox'}</strong>.
      </p>

      <form onSubmit={verify} className="mt-8 space-y-4">
        <div>
          <label htmlFor="code" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Code
          </label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="nexus-focus w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-2xl tracking-[0.3em] dark:border-slate-700 dark:bg-slate-900"
            required
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-[var(--primary)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] disabled:opacity-60"
        >
          {busy ? 'Verifying…' : 'Verify & continue'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => void resend()}
        className="mt-4 w-full text-center text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
      >
        Resend code
      </button>

      <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
        Wrong place?{' '}
        <Link href="/signup" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
          Sign up
        </Link>{' '}
        or{' '}
        <button
          type="button"
          className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
          onClick={() => router.push('/login')}
        >
          Log in
        </button>
      </p>
    </div>
  );
}

export default function VerifySignupPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <AuthPageHeader />
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <Suspense
          fallback={
            <div className="text-sm text-slate-600 dark:text-slate-400">Loading…</div>
          }
        >
          <VerifySignupInner />
        </Suspense>
      </div>
      <Toaster position="top-center" />
    </div>
  );
}
