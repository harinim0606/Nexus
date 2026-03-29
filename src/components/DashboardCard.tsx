import { ReactNode } from 'react';

interface DashboardCardProps {
  title: string;
  value: number | string;
  icon?: ReactNode;
}

export default function DashboardCard({ title, value, icon }: DashboardCardProps) {
  return (
    <div className="nexus-card enter-up rounded-2xl p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
        {icon ? <span className="text-xl">{icon}</span> : null}
      </div>
      <p className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

