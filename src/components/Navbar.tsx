'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-40 border-b transition-all duration-300 ${
        isScrolled
          ? 'nexus-glass border-slate-200/70 shadow-sm'
          : 'bg-transparent border-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="text-2xl font-black tracking-tight text-slate-900">
          <span className="bg-gradient-to-r from-blue-700 to-violet-600 bg-clip-text text-transparent">NEXUS</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link
            href="/explore-events"
            className="group relative text-sm font-semibold text-slate-700 transition hover:text-blue-700"
          >
            Explore Events
            <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-blue-600 transition-all group-hover:w-full" />
          </Link>
          <Link
            href="/login"
            className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:scale-[1.03] hover:bg-[var(--primary-dark)]"
          >
            Login / Signup
          </Link>
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
          mobileOpen ? 'max-h-44' : 'max-h-0'
        }`}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4">
          <Link href="/explore-events" className="text-sm font-semibold text-slate-700" onClick={() => setMobileOpen(false)}>
            Explore Events
          </Link>
          <Link
            href="/login"
            className="inline-flex w-fit rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
            onClick={() => setMobileOpen(false)}
          >
            Login / Signup
          </Link>
        </div>
      </div>
    </nav>
  );
}