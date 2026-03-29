'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { redirectAfterSignIn } from '@/lib/authSession';

function VerifyContent() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawToken = searchParams.get('token');
  const token = rawToken ? decodeURIComponent(rawToken) : null;

  const verifyOtp = useCallback(
    async (otp: string) => {
      try {
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ token: otp }),
        });
        const data = await res.json();
        if (res.ok) {
          toast.success('Login successful!');
          redirectAfterSignIn(data?.user?.role);
          return;
        }
        toast.error(data.error || 'Invalid or expired link');
        router.replace('/login');
      } catch {
        toast.error('Verification failed');
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    if (!token) {
      toast.error('Missing token in link');
      router.replace('/login');
      setLoading(false);
      return;
    }
    void verifyOtp(token);
  }, [token, router, verifyOtp]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600 dark:text-slate-400">
        Verifying…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Toaster />
    </div>
  );
}

export default function Verify() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-slate-600 dark:text-slate-400">
          Verifying…
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
