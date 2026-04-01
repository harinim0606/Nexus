'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import QrScannerPanel from '@/components/QrScannerPanel';

export default function CoordinatorScanPage() {
  return (
    <div className="min-h-screen nexus-animated-bg">
      <Navbar />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">QR check-in</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Scan attendee entry passes. Only coordinators can use this page — attendance is saved and the participation
          certificate is emailed automatically.
        </p>
        <div className="nexus-card mt-8 rounded-2xl p-6">
          <QrScannerPanel eventsUrl="/api/events?mine=1" />
        </div>
      </div>
      <Footer />
    </div>
  );
}
