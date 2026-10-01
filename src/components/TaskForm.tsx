'use client';

import { useMemo, useState } from 'react';

type Handler = { id: number; name: string; whatsapp: string };

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function TaskForm({
  handlers,
  onCreated,
}: {
  handlers: Handler[];
  onCreated: () => void;
}) {
  const [handlerId, setHandlerId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState(toLocalInputValue(new Date()));
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const durationMinutes = useMemo(() => Math.max(1, Number(hours) * 60 + Number(minutes)), [hours, minutes]);

  const deadline = useMemo(() => {
    const start = new Date(startTime);
    if (isNaN(start.getTime())) return null;
    return new Date(start.getTime() + durationMinutes * 60000);
  }, [startTime, durationMinutes]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handlerId: Number(handlerId),
          title,
          description,
          startTime: new Date(startTime).toISOString(),
          durationMinutes,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create task');
        return;
      }

      setSuccess(`Task assigned — WhatsApp sent to ${data.task.handler.name}.`);
      setTitle('');
      setDescription('');
      setHours(1);
      setMinutes(0);
      onCreated();
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card h-fit space-y-4 lg:sticky lg:top-20">
      <div>
        <h2 className="text-lg font-semibold">Assign New Task</h2>
        <p className="mt-1 text-sm text-slate-400">
          The handler gets an instant WhatsApp and a calendar event is created.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="handler">Task Handler</label>
        <select
          id="handler"
          className="input"
          value={handlerId}
          onChange={(e) => setHandlerId(e.target.value)}
          required
        >
          <option value="">Select a handler…</option>
          {handlers.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name} ({h.whatsapp})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="title">Task Title</label>
        <input
          id="title"
          className="input"
          placeholder="e.g. Prepare quarterly report"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="description">Description</label>
        <textarea
          id="description"
          className="input min-h-[80px] resize-y"
          placeholder="Details, deliverables, notes…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="start">Start Time</label>
        <input
          id="start"
          type="datetime-local"
          className="input"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="label">Duration</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={72}
            className="input"
            value={hours}
            onChange={(e) => setHours(Math.max(0, Number(e.target.value)))}
            aria-label="Hours"
          />
          <span className="text-sm text-slate-400">hrs</span>
          <input
            type="number"
            min={0}
            max={59}
            className="input"
            value={minutes}
            onChange={(e) => setMinutes(Math.min(59, Math.max(0, Number(e.target.value))))}
            aria-label="Minutes"
          />
          <span className="text-sm text-slate-400">min</span>
        </div>
      </div>

      {deadline && (
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm">
          <span className="text-slate-500">Deadline: </span>
          <span className="font-medium text-slate-200">{deadline.toLocaleString()}</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          {success}
        </div>
      )}

      <button type="submit" className="btn-primary w-full" disabled={loading || !handlerId}>
        {loading ? 'Assigning…' : '➤ Assign Task'}
      </button>
    </form>
  );
}
