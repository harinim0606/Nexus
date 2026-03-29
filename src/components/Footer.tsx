import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/70 bg-white/80">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-8 text-sm text-slate-600 md:flex-row md:items-center">
        <p>© {new Date().getFullYear()} NEXUS. Modern event operations platform.</p>
        <div className="flex items-center gap-5">
          <Link href="/" className="transition hover:text-blue-700">Home</Link>
          <Link href="/explore-events" className="transition hover:text-blue-700">Explore</Link>
          <Link href="/dashboard" className="transition hover:text-blue-700">Dashboard</Link>
        </div>
      </div>
    </footer>
  );
}

