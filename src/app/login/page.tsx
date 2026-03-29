'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import { redirectAfterSignIn } from '@/lib/authSession';
import AuthPageHeader from '@/components/AuthPageHeader';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showStaffLogin, setShowStaffLogin] = useState(false);

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/magic-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Check your email — open the magic link to sign in.');
      } else {
        toast.error(data.error || 'Could not send link');
      }
    } catch {
      toast.error('Something went wrong');
    }
  };

  const passwordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password, isMagicLogin: false }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Signed in');
        redirectAfterSignIn(data?.user?.role);
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error('Login failed');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <AuthPageHeader />
      <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="nexus-card w-full max-w-md rounded-2xl p-8 shadow-xl">
        <h1 className="text-center text-2xl font-bold text-slate-900 dark:text-white">Sign in</h1>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          Passwordless login — we&apos;ll email you a secure link. No password required.
        </p>

        <form onSubmit={sendMagicLink} className="mt-8 space-y-4">
          <div>
            <label htmlFor="magic-email" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Email
            </label>
            <input
              id="magic-email"
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
            Email me a login link
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-700" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-500 dark:bg-slate-950">Or</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowStaffLogin((v) => !v)}
          className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          {showStaffLogin ? 'Hide staff login' : 'Staff login (password)'}
        </button>

        {showStaffLogin ? (
          <form onSubmit={passwordLogin} className="mt-4 space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              For Admin and Coordinators with a password (e.g. seeded accounts).
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="nexus-focus w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="nexus-focus w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              Sign in with password
            </button>
          </form>
        ) : null}

        <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
          New here?{' '}
          <Link href="/signup" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
            Create an account
          </Link>
        </p>
        <Toaster position="top-center" />
      </div>
      </div>
    </div>
  );
}
