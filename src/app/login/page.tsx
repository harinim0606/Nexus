'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isMagicLogin, setIsMagicLogin] = useState(true);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, isMagicLogin }),
      });
      const data = await res.json();
      if (res.ok) {
        if (isMagicLogin) {
          toast.success('Magic link sent to your email!');
        } else {
          toast.success('Login successful!');
          router.push('/dashboard');
        }
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Login to NEXUS</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          {!isMagicLogin && (
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          )}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="magic"
              checked={isMagicLogin}
              onChange={(e) => setIsMagicLogin(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="magic" className="text-sm">Use magic login (OTP via email)</label>
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700">
            {isMagicLogin ? 'Send Magic Link' : 'Login'}
          </button>
        </form>
        <p className="mt-4 text-center">
          Don&apos;t have an account? <Link href="/signup" className="text-indigo-600">Sign up</Link>
        </p>
        <Toaster />
      </div>
    </div>
  );
}