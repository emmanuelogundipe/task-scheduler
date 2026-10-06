'use client';

import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../AppContext';
import TaskFormModal from './TaskFormModal';
import TaskTable, { type TaskRow, type TaskAction } from './TaskTable';
import { StatCard } from '../ui/StatCard';

type Handler = { id: number; name: string; whatsappNumber: string };

const TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'OVERDUE', label: 'Overdue' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

export default function TasksClient() {
  const { refreshKey, refresh } = useApp();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [handlers, setHandlers] = useState<Handler[]>([]);
  const [tab, setTab] = useState('IN_PROGRESS');
  const [search, setSearch] = useState('');
  const [handlerId, setHandlerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (tab !== 'ALL') params.set('status', tab);
      if (search.trim()) params.set('search', search.trim());
      if (handlerId) params.set('handlerId', handlerId);
      const [tRes, hRes] = await Promise.all([
        fetch(`/api/tasks?${params.toString()}`),
        fetch('/api/team?activeOnly=true'),
      ]);
      const tData = await tRes.json();
      const hData = await hRes.json();
      setTasks(tData.tasks ?? []);
      setHandlers(hData.handlers ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [tab, search, handlerId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(id);
  }, [toast]);

  async function handleAction(id: number, action: TaskAction) {
    if (action === 'delete') {
      if (!confirm('Delete this task permanently?')) return;
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    } else {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setToast({ msg: data.error ?? 'Action failed', ok: false });
        return;
      }
      const labels: Record<string, string> = {
        complete: 'Task marked as complete — awaiting approval.',
        approve: 'Task approved. All reminders have stopped.',
        cancel: 'Task cancelled.',
      };
      setToast({ msg: labels[action] ?? 'Done.', ok: true });
    }
    load();
    refresh();
  }

  const counts = {
    inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    pending: tasks.filter((t) => t.status === 'PENDING_APPROVAL').length,
    completed: tasks.filter((t) => t.status === 'COMPLETED').length,
    overdue: tasks.filter((t) => t.overdue).length,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Tasks</h1>
          <p className="text-sm text-slate-400">Create, track and approve tasks.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ New Task</button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="In Progress" value={counts.inProgress} accent="text-amber-400" />
        <StatCard label="Pending Approval" value={counts.pending} accent="text-sky-400" />
        <StatCard label="Completed" value={counts.completed} accent="text-emerald-400" />
        <StatCard label="Overdue" value={counts.overdue} accent="text-red-400" />
      </div>

      {/* Filters */}
      <div className="card space-y-3 !p-4">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                tab === t.key ? 'bg-brand-600 text-white' : 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="input sm:flex-1"
            placeholder="Search by task title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="input sm:w-56" value={handlerId} onChange={(e) => setHandlerId(e.target.value)}>
            <option value="">All handlers</option>
            {handlers.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>
      </div>

      {toast && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            toast.ok
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-red-500/30 bg-red-500/10 text-red-400'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {loading ? (
        <div className="card text-center text-sm text-slate-500">Loading tasks…</div>
      ) : (
        <TaskTable tasks={tasks} onAction={handleAction} emptyMessage={`No ${tab === 'ALL' ? '' : tab.replace(/_/g, ' ').toLowerCase() + ' '}tasks found.`} />
      )}

      <TaskFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        handlers={handlers}
        onResult={(msg, ok) => {
          setToast({ msg, ok });
          load();
          refresh();
        }}
      />
    </div>
  );
}
