'use client';

const testimonials = [
  {
    role: 'Admin',
    name: 'Ops Lead',
    org: 'Campus IT',
    quote:
      'Central control for events, users, and announcements. Faculty and student coordinators get their own views—exactly what we needed.',
  },
  {
    role: 'Faculty Coordinator',
    name: 'Dr. Sarah Chen',
    org: 'Symposium Committee',
    quote:
      'Scheduling clashes used to be chaos. NEXUS makes event ops feel like a real product—clean, fast, and reliable.',
  },
  {
    role: 'Student Coordinator',
    name: 'Alex Rivera',
    org: 'Tech Fest Team',
    quote:
      'Registrations, waitlist, and chat in one place. The dashboard updates smoothly and the QR flow is super practical.',
  },
  {
    role: 'Participant',
    name: 'Jordan Kim',
    org: 'College Club',
    quote:
      'Magic-link login, browse events, register in seconds. The participant dashboard keeps my registrations in one place.',
  },
];

export default function TestimonialsSection() {
  return (
    <section className="px-6 pb-20 md:pb-24">
      <div className="mx-auto max-w-6xl">
        <div className="enter-up mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">Testimonials</h2>
          <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
            Admin, faculty & student coordinators, and participants—each with role-based dashboards tailored to how they work.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {testimonials.map((t, idx) => (
            <figure
              key={t.role}
              className="nexus-card enter-up rounded-2xl p-6 transition duration-300 hover:-translate-y-1 hover:shadow-xl"
              style={{ animationDelay: `${idx * 90}ms` }}
            >
              <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">{t.role}</p>
              <blockquote className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">“{t.quote}”</blockquote>
              <figcaption className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">
                {t.name}
                <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">{t.org}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

