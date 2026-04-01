'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Html5Qrcode } from 'html5-qrcode';

type EventOption = { id: string; name: string };

function parseRegistrationIdFromPayload(text: string): string | null {
  const m = text.trim().match(/^nexus:([^:]+):/);
  return m ? m[1] : null;
}

type Props = {
  eventsUrl: string;
};

export default function QrScannerPanel({ eventsUrl }: Props) {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [eventId, setEventId] = useState('');
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const regionId = 'nexus-qr-reader';

  useEffect(() => {
    void fetch(eventsUrl, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((data: unknown) => {
        if (!Array.isArray(data)) return;
        setEvents(
          data
            .filter((e): e is EventOption => typeof e === 'object' && e !== null && 'id' in e && 'name' in e)
            .map((e) => ({ id: String((e as EventOption).id), name: String((e as EventOption).name) }))
        );
      })
      .catch(() => toast.error('Could not load events'));
  }, [eventsUrl]);

  useEffect(() => {
    return () => {
      void scannerRef.current?.stop().catch(() => {});
      scannerRef.current = null;
    };
  }, []);

  const stopScanner = useCallback(async () => {
    try {
      await scannerRef.current?.stop();
    } catch {
      /* ignore */
    }
    scannerRef.current = null;
    setScanning(false);
  }, []);

  const submitCheckIn = useCallback(async (decodedText: string, forEventId: string) => {
    const registrationId = parseRegistrationIdFromPayload(decodedText);
    if (!registrationId) {
      toast.error('Unrecognized QR format');
      return;
    }
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        registrationId,
        method: 'QR',
        qrToken: decodedText.trim(),
        eventId: forEventId,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; checkedInAt?: string };
    if (!res.ok) {
      toast.error(data.error || 'Check-in failed');
      return;
    }
    toast.success('Checked in — certificate emailed to participant');
  }, []);

  const startScanner = async () => {
    if (!eventId) {
      toast.error('Select an event first');
      return;
    }
    if (scanning) {
      await stopScanner();
      return;
    }
    const el = document.getElementById(regionId);
    if (!el) return;

    setScanning(true);
    const qr = new Html5Qrcode(regionId);
    scannerRef.current = qr;

    const ev = eventId;
    try {
      await qr.start(
        { facingMode: 'environment' },
        { fps: 8, qrbox: { width: 260, height: 260 } },
        async (decodedText) => {
          try {
            await qr.stop();
          } catch {
            /* ignore */
          }
          scannerRef.current = null;
          setScanning(false);
          await submitCheckIn(decodedText, ev);
        },
        () => {}
      );
    } catch (e) {
      console.error(e);
      toast.error('Camera failed — allow camera access or use HTTPS');
      scannerRef.current = null;
      setScanning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Event</label>
        <select
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="nexus-focus w-full max-w-md rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
        >
          <option value="">Choose event…</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">Only registrants for this event can be checked in.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void startScanner()}
          className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
        >
          {scanning ? 'Scanner running — scan a code' : 'Open camera & scan'}
        </button>
        {scanning ? (
          <button
            type="button"
            onClick={() => void stopScanner()}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-600"
          >
            Stop camera
          </button>
        ) : null}
      </div>

      <div
        id={regionId}
        className="mx-auto min-h-[280px] max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-black/5 dark:border-slate-700"
      />
    </div>
  );
}
