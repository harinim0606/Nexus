'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

function VerifyContent() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      verifyToken(token);
    }
  }, [token]);

  const verifyToken = async (token: string) => {
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Login successful!');
        router.push('/dashboard');
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Verifying...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Toaster />
    </div>
  );
}

export default function Verify() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Verifying...
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}