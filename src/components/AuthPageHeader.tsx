import Link from 'next/link';

/** Top bar for auth pages: NEXUS logo (links home) + Home navigation. */
export default function AuthPageHeader() {
  return (
    <header className="flex w-full items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 py-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/90 sm:px-6">
      <Link
        href="/"
        className="text-2xl font-black tracking-tight text-slate-900 dark:text-white"
        aria-label="NEXUS home"
      >
        <span className="bg-gradient-to-r from-blue-700 to-violet-600 bg-clip-text text-transparent">NEXUS</span>
      </Link>
      <Link
        href="/"
        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-blue-600 dark:hover:text-blue-300"
      >
        Home
      </Link>
    </header>
  );
}
