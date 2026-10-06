'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useApp } from '../AppContext';
import { StatCard } from '../ui/StatCard';
import { ProgressBar } from '../ui/ProgressBar';

interface Stats {
  total: number;
  inProgress: number;
  pendingApproval: number;
  completed: number;
  overdue: number;
  dueToday: number;
  dueSoon: number;
  assignedToday: number;
  handlers: number;
}

interface ActiveTask {
  id: number;
  title: string;
  handler: string;
  deadlineTime: string;
  progress: number;
  overdue: boolean;
}

interface Activity {
  id: number;
  action: string;
  details: string | null;
  user: string;
  task: string | null;
  createdAt: string;
}

const ACTION_ICONS: Record<string, string> = {
  TASK_CREATED: '🆕',
  TASK_COMPLETED: '📤',
  TASK_APPROVED: '✅',
  TASK_CANCELLED: '🚫',
  TASK_EDITED: '✏️',
  WHATSAPP_SENT: '📱',
  WHATSAPP_FAILED: '⚠️',
  ADMIN_LOGIN: '🔑',
  HANDLER_ADDED: '👤',
};

export default function DashboardClient() {
  const { refreshKey } = useApp();
  const [stats, setStats] = useState<Stats | null>(null);
  const [activeTasks, setActiveTasks] = useState<ActiveTask[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      if (!res.ok) return;
      const data = await res.json();
      setStats(data.stats);
      setActiveTasks(data.activeTasks ?? []);
      setActivity(data.recentActivity ?? []);
    } catch {
      /* keep previous data on transient error */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-sm text-slate-400">Overview of the organization&apos;s tasks.</p>
        </div>
        <Link href="/tasks" className="btn-primary">+ New Task</Link>
      </div>

      {loading && !stats ? (
        <div className="card text-center text-sm text-slate-500">Loading dashboard…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <StatCard label="Total Tasks" value={stats?.total ?? 0} icon="🗂️" />
            <StatCard label="In Progress" value={stats?.inProgress ?? 0} accent="text-amber-400" icon="⏳" />
            <StatCard label="Pending Approval" value={stats?.pendingApproval ?? 0} accent="text-sky-400" icon="📥" />
            <StatCard label="Completed" value={stats?.completed ?? 0} accent="text-emerald-400" icon="✅" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <StatCard label="Overdue" value={stats?.overdue ?? 0} accent="text-red-400" icon="🚨" />
            <StatCard label="Due Today" value={stats?.dueToday ?? 0} icon="📅" />
            <StatCard label="Due Soon" value={stats?.dueSoon ?? 0} icon="⏰" hint="Next 6 hours" />
            <StatCard label="Assigned Today" value={stats?.assignedToday ?? 0} icon="📝" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Active tasks */}
            <section className="card">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">Active Tasks</h2>
                <Link href="/tasks" className="text-xs text-brand-400 hover:text-brand-300">
                  View all →
                </Link>
              </div>
              {activeTasks.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">No active tasks right now.</p>
              ) : (
                <div className="space-y-3">
                  {activeTasks.map((t) => (
                    <div key={t.id} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-100">{t.title}</p>
                          <p className="text-xs text-slate-500">
                            👤 {t.handler} · Due {t.deadlineTime}
                          </p>
                        </div>
                        {t.overdue && (
                          <span className="badge border-red-500/30 bg-red-500/10 text-red-400">OVERDUE</span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <ProgressBar value={t.progress} />
                        <span className="text-xs text-slate-400">{t.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Recent activity */}
            <section className="card">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">Recent Activity</h2>
                <Link href="/notifications" className="text-xs text-brand-400 hover:text-brand-300">
                  Notifications →
                </Link>
              </div>
              {activity.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">No activity yet.</p>
              ) : (
                <ol className="space-y-2.5">
                  {activity.map((a) => (
                    <li key={a.id} className="flex gap-3 text-sm">
                      <span className="mt-0.5">{ACTION_ICONS[a.action] ?? '•'}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-slate-300">
                          <span className="font-medium">{a.action.replace(/_/g, ' ')}</span>
                          {a.task ? ` — ${a.task}` : ''}
                        </p>
                        <p className="text-xs text-slate-500">
                          {a.user}
                          {a.details ? ` · ${a.details}` : ''} ·{' '}
                          {new Date(a.createdAt).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
