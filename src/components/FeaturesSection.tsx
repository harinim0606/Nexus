'use client';

const features = [
  {
    title: 'Easy Registration',
    icon: '🎟',
    copy: 'Fast individual and team onboarding with duplicate prevention and confirmation flow.',
  },
  {
    title: 'Live Dashboard',
    icon: '📊',
    copy: 'Track registrations, upcoming events, and attendance with auto-refreshing controls.',
  },
  {
    title: 'QR Check-in',
    icon: '📱',
    copy: 'Generate secure event QR codes and mark attendance instantly with smooth workflows.',
  },
  {
    title: 'Coordinator Collaboration',
    icon: '💬',
    copy: 'Built-in event chat and announcements keep participants and coordinators in sync.',
  },
];

export default function FeaturesSection() {
  return (
    <section className="px-6 pb-20 md:pb-24">
      <div className="mx-auto max-w-6xl">
        <div className="enter-up mb-8">
          <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Why teams choose NEXUS</h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Dynamic workflows, polished UI, and coordinator-friendly tools from registration to final attendance.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((item, idx) => (
            <article
              key={item.title}
              className="nexus-card enter-up rounded-2xl p-5 transition duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-xl"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className="text-2xl">{item.icon}</div>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

