'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import TaskForm from './TaskForm';
import TaskCard from './TaskCard';

type Task = {
  id: number;
  title: string;
  description: string;
  status: string;
  startTime: string;
  durationMinutes: number;
  deadline: string;
  createdAt: string;
  completedAt: string | null;
  handler: { id: number; name: string; whatsapp: string };
};

type Handler = { id: number; name: string; whatsapp: string };

const TABS = [
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { key: 'COMPLETED', label: 'Completed' },
] as const;

export default function DashboardClient({ admin }: { admin: { name: string; whatsapp: string } }) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [handlers, setHandlers] = useState<Handler[]>([]);
  const [tab, setTab] = useState<string>('IN_PROGRESS');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [tRes, hRes] = await Promise.all([fetch('/api/tasks'), fetch('/api/handlers')]);
      const tData = await tRes.json();
      const hData = await hRes.json();
      setTasks(tData.tasks ?? []);
      setHandlers(hData.handlers ?? []);
    } catch {
      /* keep stale data on transient errors */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Poll so milestone/deadline changes made by the cron engine appear live
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, [refresh]);

  const stats = useMemo(
    () => ({
      inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
      pending: tasks.filter((t) => t.status === 'PENDING_APPROVAL').length,
      completed: tasks.filter((t) => t.status === 'COMPLETED').length,
      handlers: handlers.length,
    }),
    [tasks, handlers]
  );

  const visibleTasks = useMemo(() => tasks.filter((t) => t.status === tab), [tasks, tab]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  async function changeStatus(id: number, action: 'submit' | 'approve') {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    refresh();
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-lg">
              📋
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight">OfficeTask</h1>
              <p className="text-xs text-slate-500">Task Scheduler & Reminders</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight">{admin.name}</p>
              <p className="text-xs text-slate-500">{admin.whatsapp}</p>
            </div>
            <button
              onClick={() => router.push('/settings')}
              className="btn-ghost !px-3 !py-1.5 text-xs"
            >
              ⚙️ Settings
            </button>
            <button onClick={logout} className="btn-ghost !px-3 !py-1.5 text-xs">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="In Progress" value={stats.inProgress} accent="text-amber-400" />
          <StatCard label="Pending Approval" value={stats.pending} accent="text-sky-400" />
          <StatCard label="Completed" value={stats.completed} accent="text-emerald-400" />
          <StatCard label="Team Members" value={stats.handlers} accent="text-brand-400" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Task creation form */}
          <TaskForm handlers={handlers} onCreated={refresh} />

          {/* Task list */}
          <section>
            <div className="mb-4 flex gap-2">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    tab === t.key
                      ? 'bg-brand-600 text-white'
                      : 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {t.label}
                  <span className="ml-2 rounded-full bg-black/30 px-2 py-0.5 text-xs">
                    {tasks.filter((x) => x.status === t.key).length}
                  </span>
                </button>
              ))}
            </div>

            {loading ? (
              <div className="card text-center text-sm text-slate-500">Loading tasks…</div>
            ) : visibleTasks.length === 0 ? (
              <div className="card py-12 text-center">
                <div className="mb-2 text-3xl">🗂️</div>
                <p className="text-sm text-slate-500">
                  No {TABS.find((t) => t.key === tab)?.label.toLowerCase()} tasks yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onChangeStatus={changeStatus} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="card !p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}
