'use client';

import { useEffect, useMemo, useState } from 'react';
import { parseEventStartEnd } from '@/lib/schedule';

interface CountdownTimerProps {
  eventDate: Date | string;
  eventTime: string;
}

export default function CountdownTimer({ eventDate, eventTime }: CountdownTimerProps) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const label = useMemo(() => {
    const parsed = parseEventStartEnd(new Date(eventDate), eventTime);
    if (!parsed) return 'Schedule unavailable';
    const diff = parsed.start.getTime() - now;
    if (diff <= 0) return 'Live / Started';

    const totalSec = Math.floor(diff / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${days}d ${hours}h ${mins}m ${secs}s`;
  }, [eventDate, eventTime, now]);

  return <p className="text-xs text-indigo-700 font-medium">Starts in: {label}</p>;
}

