'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CertificateFieldBinding, CertificateTemplateV1 } from '@/lib/certificatePdf';
import toast from 'react-hot-toast';

const BINDINGS: { key: CertificateFieldBinding; label: string }[] = [
  { key: 'participantName', label: 'Participant name' },
  { key: 'eventName', label: 'Event name' },
  { key: 'email', label: 'Email' },
  { key: 'issuedDate', label: 'Issued date' },
];

function defaultTemplate(): CertificateTemplateV1 {
  return {
    version: 1,
    width: 800,
    height: 600,
    fields: [
      { id: 'f1', binding: 'participantName', x: 400, y: 260, fontSize: 22 },
      { id: 'f2', binding: 'eventName', x: 400, y: 320, fontSize: 14 },
    ],
  };
}

function serialize(t: CertificateTemplateV1): string {
  return JSON.stringify(t);
}

type Props = {
  eventId: string;
  eventName: string;
  events: Array<{ id: string; name: string }>;
  onEventChange: (id: string) => void;
};

export default function CertificateDesignerPanel({ eventId, eventName, events, onEventChange }: Props) {
  const [tpl, setTpl] = useState<CertificateTemplateV1>(defaultTemplate);
  const [dragId, setDragId] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const previewRef = useRef<HTMLDivElement>(null);

  const loadTemplate = useCallback(async () => {
    if (!eventId) return;
    const res = await fetch(`/api/events/${eventId}/certificate-template`, { credentials: 'same-origin' });
    if (!res.ok) return;
    const row = await res.json();
    if (row?.templateData) {
      try {
        const parsed = JSON.parse(row.templateData) as CertificateTemplateV1;
        if (parsed && typeof parsed.width === 'number') {
          setTpl({ ...defaultTemplate(), ...parsed, fields: parsed.fields?.length ? parsed.fields : defaultTemplate().fields });
          return;
        }
      } catch {
        /* use default */
      }
    }
    setTpl(defaultTemplate());
  }, [eventId]);

  useEffect(() => {
    void loadTemplate();
  }, [loadTemplate]);

  const save = async () => {
    if (!eventId) {
      toast.error('Select an event');
      return;
    }
    const res = await fetch(`/api/events/${eventId}/certificate-template`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ templateData: serialize(tpl) }),
    });
    if (!res.ok) {
      toast.error('Could not save template');
      return;
    }
    toast.success('Template saved');
  };

  const previewPdf = async () => {
    if (!eventId) return;
    const res = await fetch(`/api/events/${eventId}/certificates/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        templateData: serialize(tpl),
        participantName: 'Alex Morgan',
        eventName,
        email: 'alex@university.edu',
        issuedDate: new Date().toLocaleDateString(),
      }),
    });
    if (!res.ok) {
      toast.error('Preview failed');
      return;
    }
    const blob = await res.blob();
    window.open(URL.createObjectURL(blob), '_blank');
    toast.success('Preview opened');
  };

  const bulkIssue = async () => {
    if (!eventId) return;
    const res = await fetch(`/api/events/${eventId}/certificates/bulk`, {
      method: 'POST',
      credentials: 'same-origin',
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || 'Bulk issue failed');
      return;
    }
    toast.success(`Issued ${data.issued} certificates (email sent with download instructions)`);
  };

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image (PNG or JPG)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl_ = reader.result as string;
      const img = new Image();
      img.onload = () => {
        setTpl((prev) => ({
          ...prev,
          backgroundDataUrl: dataUrl_,
          width: img.naturalWidth,
          height: img.naturalHeight,
        }));
        toast.success('Background image attached — adjust field positions to match.');
      };
      img.src = dataUrl_;
    };
    reader.readAsDataURL(file);
  };

  const addField = (binding: CertificateFieldBinding) => {
    setTpl((prev) => ({
      ...prev,
      fields: [
        ...prev.fields,
        {
          id: `fld_${Date.now()}`,
          binding,
          x: Math.round(prev.width / 2 - 80),
          y: Math.round(prev.height / 2),
          fontSize: 16,
        },
      ],
    }));
  };

  const removeField = (id: string) => {
    setTpl((prev) => ({ ...prev, fields: prev.fields.filter((f) => f.id !== id) }));
  };

  const onFieldPointerDown = (e: React.PointerEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const el = previewRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const field = tpl.fields.find((f) => f.id === id);
    if (!field) return;
    const scaleX = tpl.width / rect.width;
    const scaleY = tpl.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    dragOffset.current = { x: px - field.x, y: py - field.y };
    setDragId(id);
  };

  useEffect(() => {
    if (!dragId) return;

    const onMove = (e: PointerEvent) => {
      const el = previewRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scaleX = tpl.width / rect.width;
      const scaleY = tpl.height / rect.height;
      let x = (e.clientX - rect.left) * scaleX - dragOffset.current.x;
      let y = (e.clientY - rect.top) * scaleY - dragOffset.current.y;
      x = Math.max(0, Math.min(tpl.width - 40, x));
      y = Math.max(0, Math.min(tpl.height - 20, y));

      setTpl((prev) => ({
        ...prev,
        fields: prev.fields.map((f) => (f.id === dragId ? { ...f, x, y } : f)),
      }));
    };

    const onUp = () => setDragId(null);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragId, tpl.width, tpl.height]);

  const scalePreview = 0.55;
  const pw = Math.round(tpl.width * scalePreview);
  const ph = Math.round(tpl.height * scalePreview);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block flex-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
          Event
          <select
            value={eventId}
            onChange={(e) => onEventChange(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
          Upload template image
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="mt-1 block w-full text-xs text-slate-500"
            onChange={onUpload}
          />
        </label>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Drag labels on the preview to position merge fields. PDF output scales to A4 automatically. Add fields with the buttons
        below, then save — use <strong>Sample PDF</strong> to verify layout before bulk issue.
      </p>

      <div className="flex flex-wrap gap-2">
        {BINDINGS.map((b) => (
          <button
            key={b.key}
            type="button"
            onClick={() => addField(b.key)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
          >
            + {b.label}
          </button>
        ))}
      </div>

      <div
        ref={previewRef}
        className="relative mx-auto overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-800"
        style={{ width: pw, height: ph }}
      >
        {tpl.backgroundDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tpl.backgroundDataUrl} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-500">Upload a background image</div>
        )}
        {tpl.fields.map((f) => {
          const label = BINDINGS.find((b) => b.key === f.binding)?.label ?? f.binding;
          const left = (f.x / tpl.width) * 100;
          const top = (f.y / tpl.height) * 100;
          return (
            <div
              key={f.id}
              className="absolute z-10 flex items-center gap-0.5"
              style={{ left: `${left}%`, top: `${top}%`, transform: 'translate(-50%, -50%)' }}
            >
              <span
                role="presentation"
                onPointerDown={(e) => onFieldPointerDown(e, f.id)}
                className={`cursor-grab select-none rounded border px-2 py-1 text-[10px] font-bold shadow active:cursor-grabbing ${
                  dragId === f.id ? 'border-blue-500 bg-blue-100 dark:bg-blue-950' : 'border-indigo-400 bg-white/95 dark:bg-slate-900/95'
                }`}
              >
                {label}
              </span>
              <button
                type="button"
                className="rounded bg-red-500/90 px-1 text-[10px] font-bold text-white"
                onClick={() => removeField(f.id)}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={save} className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white">
          Save template
        </button>
        <button
          type="button"
          onClick={previewPdf}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-600"
        >
          Sample PDF preview
        </button>
        <button
          type="button"
          onClick={bulkIssue}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
        >
          Bulk generate + email
        </button>
      </div>
    </div>
  );
}
