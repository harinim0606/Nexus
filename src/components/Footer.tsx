import Link from 'next/link';

const social = [
  { label: 'GitHub', href: 'https://github.com', rel: 'noopener noreferrer' },
  { label: 'LinkedIn', href: 'https://linkedin.com', rel: 'noopener noreferrer' },
  { label: 'X', href: 'https://x.com', rel: 'noopener noreferrer' },
];

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/70 bg-white/80 dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-lg font-black tracking-tight text-slate-900 dark:text-white">NEXUS</p>
            <p className="mt-2 max-w-sm text-sm text-slate-600 dark:text-slate-400">
              Smart AI-powered event & symposium management for coordinators and participants.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Contact</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li>
                <a href="mailto:hello@nexus.local" className="transition hover:text-blue-600 dark:hover:text-blue-400">
                  hello@nexus.local
                </a>
              </li>
              <li>
                <a href="tel:+18005551234" className="transition hover:text-blue-600 dark:hover:text-blue-400">
                  +1 (800) 555-1234
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Follow</p>
            <ul className="mt-3 flex flex-wrap gap-4">
              {social.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel={s.rel}
                    className="text-sm font-semibold text-slate-700 transition hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-slate-200/80 pt-8 text-sm text-slate-600 dark:border-slate-800 md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} NEXUS. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/" className="transition hover:text-blue-700 dark:hover:text-blue-400">
              Home
            </Link>
            <Link href="/explore-events" className="transition hover:text-blue-700 dark:hover:text-blue-400">
              Explore
            </Link>
            <Link href="/login" className="transition hover:text-blue-700 dark:hover:text-blue-400">
              Login
            </Link>
            <Link href="/dashboard" className="transition hover:text-blue-700 dark:hover:text-blue-400">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
