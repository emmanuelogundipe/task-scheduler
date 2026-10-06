'use client';

import { useEffect, useMemo, useState } from 'react';

export type HandlerOption = { id: number; name: string; whatsappNumber: string };

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function dateValue(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function timeValue(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function humanize(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h} hour${h === 1 ? '' : 's'}`);
  if (m) parts.push(`${m} minute${m === 1 ? '' : 's'}`);
  return parts.length ? parts.join(' ') : '0 minutes';
}

export default function TaskFormModal({
  open,
  onClose,
  handlers,
  onResult,
}: {
  open: boolean;
  onClose: () => void;
  handlers: HandlerOption[];
  onResult: (msg: string, ok: boolean) => void;
}) {
  const base = useMemo(() => new Date(), [open]);
  const [handlerId, setHandlerId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(dateValue(base));
  const [startTime, setStartTime] = useState(timeValue(base));
  const [deadlineDate, setDeadlineDate] = useState(dateValue(new Date(base.getTime() + 60 * 60000)));
  const [deadlineTime, setDeadlineTime] = useState(timeValue(new Date(base.getTime() + 60 * 60000)));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      const now = new Date();
      setStartDate(dateValue(now));
      setStartTime(timeValue(now));
      const dl = new Date(now.getTime() + 60 * 60000);
      setDeadlineDate(dateValue(dl));
      setDeadlineTime(timeValue(dl));
      setTitle('');
      setDescription('');
      setHandlerId('');
      setError('');
    }
  }, [open]);

  const durationMinutes = useMemo(() => {
    const start = new Date(`${startDate}T${startTime}`);
    const deadline = new Date(`${deadlineDate}T${deadlineTime}`);
    if (isNaN(start.getTime()) || isNaN(deadline.getTime())) return 0;
    return Math.round((deadline.getTime() - start.getTime()) / 60000);
  }, [startDate, startTime, deadlineDate, deadlineTime]);

  const validDuration = durationMinutes > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!handlerId) return setError('Please select a task handler.');
    if (!validDuration) return setError('Deadline must be later than the start time.');

    setLoading(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handlerId: Number(handlerId),
          title,
          description,
          startDateTime: `${startDate}T${startTime}`,
          durationMinutes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create task');
        return;
      }
      onResult(data.message, true);
      onClose();
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:items-center">
      <form onSubmit={handleSubmit} className="card my-8 w-full max-w-xl !bg-slate-900 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Assign New Task</h2>
          <button type="button" onClick={onClose} className="btn-ghost !px-2.5 !py-1 text-xs">✕</button>
        </div>

        <div>
          <label className="label" htmlFor="handler">Task Handler</label>
          <select id="handler" className="input" value={handlerId} onChange={(e) => setHandlerId(e.target.value)} required>
            <option value="">Select a task handler…</option>
            {handlers.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.whatsappNumber})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="title">Task Title</label>
          <input id="title" className="input" placeholder="e.g. Prepare August Newsletter" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div>
          <label className="label" htmlFor="description">Task Description</label>
          <textarea id="description" className="input min-h-[80px] resize-y" placeholder="Detailed instructions…" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Start Date</label>
            <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </div>
          <div>
            <label className="label">Start Time</label>
            <input type="time" className="input" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          </div>
          <div>
            <label className="label">Deadline Date</label>
            <input type="date" className="input" value={deadlineDate} onChange={(e) => setDeadlineDate(e.target.value)} required />
          </div>
          <div>
            <label className="label">Deadline Time</label>
            <input type="time" className="input" value={deadlineTime} onChange={(e) => setDeadlineTime(e.target.value)} required />
          </div>
        </div>

        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            validDuration ? 'border-slate-800 bg-slate-950/60 text-slate-300' : 'border-red-500/30 bg-red-500/10 text-red-400'
          }`}
        >
          {validDuration ? (
            <>
              <span className="text-slate-500">Duration: </span>
              <span className="font-medium">{humanize(durationMinutes)}</span>
            </>
          ) : (
            'Deadline must be later than the start time.'
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" className="btn-primary" disabled={loading || !handlerId || !validDuration}>
            {loading ? 'Assigning…' : 'Assign Task'}
          </button>
        </div>
      </form>
    </div>
  );
}
