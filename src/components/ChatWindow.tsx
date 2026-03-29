'use client';

import { useEffect, useMemo, useState } from 'react';

type ChatUser = { id: string; name: string };
type ChatMessage = {
  id: string;
  message: string;
  timestamp: string;
  user: ChatUser;
};

interface ChatWindowProps {
  eventId: string;
}

export default function ChatWindow({ eventId }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);

  const hasText = useMemo(() => draft.trim().length > 0, [draft]);

  const fetchMessages = async () => {
    const res = await fetch(`/api/chat?eventId=${eventId}`);
    if (!res.ok) return;
    const data = await res.json();
    setMessages(data);
  };

  useEffect(() => {
    const load = async () => {
      await fetchMessages();
      setLoading(false);
    };
    load();
    const timer = setInterval(fetchMessages, 5000);
    return () => clearInterval(timer);
  }, [eventId]);

  const send = async () => {
    if (!hasText) return;
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, message: draft.trim() }),
    });
    if (!res.ok) return;
    setDraft('');
    await fetchMessages();
  };

  return (
    <section className="nexus-card rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Event Chat</h3>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Live</span>
      </div>

      <div className="h-72 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/60 p-3">
        {loading ? <p className="text-sm text-slate-500">Loading conversation...</p> : null}
        {!loading && messages.length === 0 ? <p className="text-sm text-slate-500">No messages yet.</p> : null}
        {messages.map((msg) => (
          <div key={msg.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-700">{msg.user.name}</p>
              <p className="text-[11px] text-slate-400">{new Date(msg.timestamp).toLocaleTimeString()}</p>
            </div>
            <p className="mt-1 text-sm text-slate-700">{msg.message}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type your message..."
          className="nexus-focus w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
        />
        <button
          onClick={send}
          className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-[var(--primary-dark)]"
        >
          Send
        </button>
      </div>
    </section>
  );
}

