'use client';

import Link from 'next/link';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden px-6 pt-28 pb-20 md:pt-36 md:pb-28">
      {/* Decorative glow layers for premium hero depth */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />

      <div className="relative mx-auto max-w-6xl text-center">
        <p className="enter-fade inline-flex items-center rounded-full border border-blue-200 bg-white/70 px-4 py-1 text-xs font-semibold tracking-[0.18em] text-blue-700 uppercase">
          Nexus Event Suite
        </p>

        <h1 className="enter-up mt-6 text-4xl font-black leading-tight text-slate-900 sm:text-5xl md:text-6xl">
          Smart Event Management
          <span className="block bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-600 bg-clip-text text-transparent">
            Made Effortless
          </span>
        </h1>

        <p className="enter-fade mx-auto mt-6 max-w-2xl text-base text-slate-600 sm:text-lg">
          Discover events, register in seconds, track attendance, and run live coordinator operations with a polished
          modern experience.
        </p>

        <div className="enter-up mt-9 flex items-center justify-center gap-3">
          <Link
            href="/explore-events"
            className="rounded-xl bg-[var(--primary)] px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition duration-200 hover:scale-[1.03] hover:bg-[var(--primary-dark)]"
          >
            Explore Events
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border border-slate-200 bg-white/90 px-7 py-3 text-sm font-semibold text-slate-700 transition duration-200 hover:scale-[1.03] hover:border-blue-300 hover:text-blue-700"
          >
            Go To Dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}

