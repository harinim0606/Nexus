'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { redirectAfterSignIn } from '@/lib/authSession';

export default function DashboardIndex() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
        const data = await res.json();

        if (!data?.user) {
          router.replace('/login');
          return;
        }

        redirectAfterSignIn(data.user.role);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6">
      <div className="nexus-card w-full max-w-md rounded-2xl p-6 text-center">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {loading ? 'Loading your dashboard…' : 'Redirecting…'}
        </p>
      </div>
    </div>
  );
}
