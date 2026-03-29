'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden px-6 pt-28 pb-20 md:pt-36 md:pb-28">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />

      <div className="relative mx-auto max-w-6xl text-center">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="inline-flex items-center rounded-full border border-blue-200/80 bg-white/70 px-4 py-1 text-xs font-semibold tracking-[0.18em] text-blue-700 uppercase dark:border-blue-900/60 dark:bg-slate-900/60 dark:text-blue-300"
        >
          NEXUS
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="mt-6 text-5xl font-black leading-tight tracking-tight text-slate-900 sm:text-6xl md:text-7xl dark:text-white"
        >
          NEXUS
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="mx-auto mt-5 max-w-3xl text-lg font-semibold leading-snug text-slate-700 sm:text-xl md:text-2xl dark:text-slate-200"
        >
          Smart AI-Powered Event & Symposium Management Platform
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.55, delay: 0.12 }}
          className="mx-auto mt-6 max-w-2xl text-base text-slate-600 sm:text-lg dark:text-slate-400"
        >
          Discover events, register in seconds, track attendance, and run coordinator operations from one place—built
          for campus symposiums and modern event teams.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href="/explore-events"
            className="rounded-xl bg-[var(--primary)] px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition duration-200 hover:scale-[1.03] hover:bg-[var(--primary-dark)]"
          >
            Explore Events
          </Link>
          <Link
            href="/signup"
            className="rounded-xl border border-slate-200 bg-white/90 px-7 py-3 text-sm font-semibold text-slate-700 transition duration-200 hover:scale-[1.03] hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200"
          >
            Register Now
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
