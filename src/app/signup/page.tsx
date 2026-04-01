'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import AuthPageHeader from '@/components/AuthPageHeader';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/magic-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.needsEmailVerification) {
          window.location.assign(`/auth/verify-signup?email=${encodeURIComponent(email.trim().toLowerCase())}`);
          return;
        }
        toast.success('Check your email for the login link.');
      } else {
        toast.error(data.error || 'Could not start signup');
      }
    } catch {
      toast.error('Signup failed');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <AuthPageHeader />
      <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="nexus-card w-full max-w-md rounded-2xl p-8 shadow-xl">
        <h1 className="text-center text-2xl font-bold text-slate-900 dark:text-white">Create account</h1>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          Create a participant account with your email — no password. We&apos;ll email you a <strong>6-digit code</strong> to
          verify your address before you can use your dashboard.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Full name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="nexus-focus w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="nexus-focus w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-[var(--primary)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)]"
          >
            Send verification code
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
            Sign in
          </Link>
        </p>
        <Toaster position="top-center" />
      </div>
      </div>
    </div>
  );
}
