'use client';

import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../AppContext';

interface NotificationRow {
  id: number;
  type: string;
  recipient: string;
  recipientWhatsApp: string;
  task: { id: number; title: string } | null;
  message: string;
  provider: string;
  status: string;
  error: string | null;
  sentAt: string | null;
  createdAt: string;
}

const TYPES = [
  'ALL',
  'TASK_ASSIGNED',
  'DAY_BEFORE_REMINDER',
  'DEADLINE_REMINDER',
  'TEST_MESSAGE',
];
const STATUSES = ['ALL', 'SENT', 'FAILED', 'PENDING'];

const STATUS_STYLE: Record<string, string> = {
  SENT: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  FAILED: 'border-red-500/30 bg-red-500/10 text-red-400',
  PENDING: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
};

export default function NotificationsClient() {
  const { refreshKey } = useApp();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [type, setType] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type !== 'ALL') params.set('type', type);
      if (status !== 'ALL') params.set('status', status);
      const res = await fetch(`/api/notifications?${params.toString()}`);
      const data = await res.json();
      setItems(data.notifications ?? []);
    } finally {
      setLoading(false);
    }
  }, [type, status]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Notifications</h1>
        <p className="text-sm text-slate-400">
          WhatsApp delivery history via UltraMsg. Click a row to view the full message.
        </p>
      </div>

      <div className="card flex flex-col gap-2 !p-4 sm:flex-row">
        <select className="input sm:w-60" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => (
            <option key={t} value={t}>{t === 'ALL' ? 'All types' : t.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select className="input sm:w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s === 'ALL' ? 'All statuses' : s}</option>
          ))}
        </select>
        <button onClick={load} className="btn-ghost sm:ml-auto">↻ Refresh</button>
      </div>

      {loading ? (
        <div className="card text-center text-sm text-slate-500">Loading notifications…</div>
      ) : items.length === 0 ? (
        <div className="card py-12 text-center">
          <div className="mb-2 text-3xl">🔔</div>
          <p className="text-sm text-slate-500">No notifications match these filters.</p>
        </div>
      ) : (
        <div className="card !p-0">
          <div className="divide-y divide-slate-800">
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => setExpanded(expanded === n.id ? null : n.id)}
                className="w-full px-4 py-3 text-left hover:bg-slate-900/40"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="badge border-slate-700 bg-slate-800/60 text-slate-300">
                    {n.type.replace(/_/g, ' ')}
                  </span>
                  <span className={`badge ${STATUS_STYLE[n.status] ?? ''}`}>{n.status}</span>
                  <span className="text-sm text-slate-300">{n.recipient}</span>
                  <span className="text-sm text-slate-500">{n.task?.title ?? '—'}</span>
                  <span className="ml-auto text-xs text-slate-500">
                    {new Date(n.createdAt).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {n.error && <p className="mt-1 text-xs text-red-400">{n.error}</p>}
                {expanded === n.id && (
                  <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
                    {n.message}
                  </pre>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
