'use client';

import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../AppContext';

interface Handler {
  id: number;
  name: string;
  whatsappNumber: string;
  status: string;
  taskCount: number;
  createdAt: string;
}

export default function TeamClient() {
  const { refreshKey, refresh } = useApp();
  const [handlers, setHandlers] = useState<Handler[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/team');
      const data = await res.json();
      setHandlers(data.handlers ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  function notify(text: string, ok = true) {
    setMsg({ text, ok });
  }

  async function addHandler(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, whatsappNumber: whatsapp }),
    });
    const data = await res.json();
    if (!res.ok) return notify(data.error ?? 'Failed to add handler', false);
    setName('');
    setWhatsapp('');
    notify(`${data.handler.name} added.`);
    load();
    refresh();
  }

  async function saveEdit(id: number) {
    const res = await fetch(`/api/team/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, whatsappNumber: editWhatsapp }),
    });
    const data = await res.json();
    if (!res.ok) return notify(data.error ?? 'Update failed', false);
    setEditingId(null);
    notify('Handler updated.');
    load();
    refresh();
  }

  async function toggleStatus(h: Handler) {
    const next = h.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const res = await fetch(`/api/team/${h.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) {
      notify(`${h.name} is now ${next.toLowerCase()}.`);
      load();
      refresh();
    }
  }

  async function removeHandler(h: Handler) {
    if (!confirm(`Remove ${h.name}?`)) return;
    const res = await fetch(`/api/team/${h.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) return notify(data.error ?? 'Delete failed', false);
    notify(data.deactivated ? `${h.name} was deactivated (historical tasks preserved).` : `${h.name} deleted.`);
    load();
    refresh();
  }

  const active = handlers.filter((h) => h.status === 'ACTIVE').length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Team Management</h1>
        <p className="text-sm text-slate-400">
          {active} active task handler{active === 1 ? '' : 's'} · {handlers.length} total
        </p>
      </div>

      <section className="card space-y-4">
        <h2 className="font-semibold">Add Task Handler</h2>
        <form onSubmit={addHandler} className="flex flex-col gap-2 sm:flex-row">
          <input className="input sm:flex-1" placeholder="Name (e.g. Miss. Areta)" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className="input sm:flex-1" placeholder="WhatsApp (e.g. +2348166460076)" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} required />
          <button type="submit" className="btn-primary shrink-0">+ Add Handler</button>
        </form>
      </section>

      {msg && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            msg.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-400'
          }`}
        >
          {msg.text}
        </div>
      )}

      <section className="card !p-0">
        {loading ? (
          <p className="p-6 text-center text-sm text-slate-500">Loading team…</p>
        ) : handlers.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">No task handlers yet.</p>
        ) : (
          <div className="divide-y divide-slate-800">
            {handlers.map((h) => (
              <div key={h.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                {editingId === h.id ? (
                  <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                    <input className="input sm:flex-1" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
                    <input className="input sm:flex-1" value={editWhatsapp} onChange={(e) => setEditWhatsapp(e.target.value)} placeholder="WhatsApp" />
                  </div>
                ) : (
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-100">{h.name}</p>
                      <span
                        className={`badge ${
                          h.status === 'ACTIVE'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                            : 'border-slate-600/40 bg-slate-700/20 text-slate-400'
                        }`}
                      >
                        {h.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">
                      {h.whatsappNumber} · {h.taskCount} task{h.taskCount === 1 ? '' : 's'}
                    </p>
                  </div>
                )}
                <div className="flex shrink-0 flex-wrap gap-2">
                  {editingId === h.id ? (
                    <>
                      <button onClick={() => saveEdit(h.id)} className="btn-primary !px-3 !py-1 text-xs">Save</button>
                      <button onClick={() => setEditingId(null)} className="btn-ghost !px-3 !py-1 text-xs">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(h.id);
                          setEditName(h.name);
                          setEditWhatsapp(h.whatsappNumber);
                        }}
                        className="btn-ghost !px-3 !py-1 text-xs"
                      >
                        ✏️ Edit
                      </button>
                      <button onClick={() => toggleStatus(h)} className="btn-ghost !px-3 !py-1 text-xs">
                        {h.status === 'ACTIVE' ? '⏸️ Deactivate' : '▶️ Activate'}
                      </button>
                      <button onClick={() => removeHandler(h)} className="btn-danger !px-3 !py-1 text-xs">
                        🗑️ Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
