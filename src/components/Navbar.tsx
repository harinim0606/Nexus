'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useThemeMode } from '@/components/ThemeProvider';
import { roleHomePath } from '@/lib/redirects';
import type { SessionUser } from '@/lib/authSession';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const { theme, toggle } = useThemeMode();

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    void fetch('/api/auth/me', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d: { user: SessionUser | null }) => setSessionUser(d.user ?? null))
      .catch(() => setSessionUser(null));
  }, []);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    setSessionUser(null);
    window.location.href = '/login';
  };

  return (
    <nav
      className={`sticky top-0 z-40 border-b transition-all duration-300 ${
        isScrolled
          ? 'nexus-glass border-slate-200/70 shadow-sm'
          : 'bg-transparent border-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          <span className="bg-gradient-to-r from-blue-700 to-violet-600 bg-clip-text text-transparent">NEXUS</span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          <Link
            href="/explore-events"
            className="group relative text-sm font-semibold text-slate-700 transition hover:text-blue-700 dark:text-slate-200"
          >
            Explore Events
            <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-blue-600 transition-all group-hover:w-full" />
          </Link>
          {!sessionUser ? (
            <Link
              href="/signup"
              className="text-sm font-semibold text-slate-700 transition hover:text-blue-700 dark:text-slate-200"
            >
              Register
            </Link>
          ) : null}
          <button
            type="button"
            onClick={toggle}
            className="rounded-xl border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200"
            aria-label="Toggle color theme"
          >
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          {sessionUser ? (
            <>
              <Link
                href={roleHomePath(sessionUser.role)}
                className="text-sm font-semibold text-slate-700 transition hover:text-blue-700 dark:text-slate-200"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                className="rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:scale-[1.03] hover:bg-[var(--primary-dark)]"
              >
                Login
              </Link>
            </>
          )}
        </div>

        <button
          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 md:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          ☰
        </button>
      </div>

      {/* Mobile sheet */}
      <div
        className={`overflow-hidden border-t border-slate-200 bg-white/95 transition-all duration-300 md:hidden ${
          mobileOpen ? 'max-h-80' : 'max-h-0'
        }`}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4">
          <Link href="/explore-events" className="text-sm font-semibold text-slate-700 dark:text-slate-200" onClick={() => setMobileOpen(false)}>
            Explore Events
          </Link>
          {!sessionUser ? (
            <Link href="/signup" className="text-sm font-semibold text-slate-700 dark:text-slate-200" onClick={() => setMobileOpen(false)}>
              Register
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => {
              toggle();
              setMobileOpen(false);
            }}
            className="w-fit rounded-xl border border-slate-200 px-3 py-2 text-left text-sm font-semibold dark:border-slate-700"
          >
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          {sessionUser ? (
            <>
              <Link
                href={roleHomePath(sessionUser.role)}
                className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                onClick={() => setMobileOpen(false)}
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={() => {
                  void logout();
                  setMobileOpen(false);
                }}
                className="w-fit rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700"
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex w-fit rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
              onClick={() => setMobileOpen(false)}
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}