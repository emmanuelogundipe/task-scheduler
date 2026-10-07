'use client';

import { useEffect, useState } from 'react';
import { StatusBadge } from '../ui/StatusBadge';
import { ProgressBar } from '../ui/ProgressBar';

export interface TaskRow {
  id: number;
  title: string;
  description: string;
  status: string;
  statusLabel: string;
  handler: { id: number; name: string; whatsappNumber: string } | null;
  startDateTime: string;
  deadlineDateTime: string;
  durationMinutes: number;
  durationLabel: string;
  progressPercentage: number;
  startLabel: string;
  deadlineLabel: string;
  deadlineTimeLabel: string;
  timeRemaining: string;
  overdue: boolean;
  completedAt: string | null;
  approvedAt: string | null;
  dayBeforeReminderSent: boolean;
  deadlineNotificationSent: boolean;
}

function humanize(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const d = Math.floor(total / 1440);
  const h = Math.floor((total % 1440) / 60);
  const m = total % 60;
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m || (!d && !h)) parts.push(`${m}m`);
  return parts.join(' ');
}

function remainingLabel(deadline: string, status: string, now: number): string {
  if (status === 'COMPLETED') return 'Completed';
  if (status === 'CANCELLED') return 'Cancelled';
  const diff = new Date(deadline).getTime() - now;
  if (diff >= 0) return `${humanize(diff / 60000)} remaining`;
  return `Overdue by ${humanize((now - new Date(deadline).getTime()) / 60000)}`;
}

function progress(task: TaskRow, now: number): number {
  if (task.status === 'COMPLETED') return 100;
  const start = new Date(task.startDateTime).getTime();
  const elapsed = (now - start) / 60000;
  return Math.min(100, Math.max(0, Math.round((elapsed / task.durationMinutes) * 100)));
}

export type TaskAction = 'complete' | 'approve' | 'cancel' | 'delete';

export default function TaskTable({
  tasks,
  onAction,
  emptyMessage = 'No tasks found.',
}: {
  tasks: TaskRow[];
  onAction: (id: number, action: TaskAction) => void;
  emptyMessage?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  if (!tasks.length) {
    return (
      <div className="card py-12 text-center">
        <div className="mb-2 text-3xl">🗂️</div>
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="card !p-0">
      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Task</th>
              <th className="px-4 py-3">Assigned To</th>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3">Deadline</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Time Remaining</th>
              <th className="px-4 py-3">Progress</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {tasks.map((task) => {
              const pct = progress(task, now);
              return (
                <tr key={task.id} className="align-top hover:bg-slate-900/40">
                  <td className="max-w-[220px] px-4 py-3">
                    <p className="font-medium text-slate-100">{task.title}</p>
                    {task.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{task.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {task.handler?.name ?? '—'}
                    <p className="text-xs text-slate-500">{task.handler?.whatsappNumber}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-400">{task.startLabel}</td>
                  <td className={`whitespace-nowrap px-4 py-3 ${task.overdue ? 'font-semibold text-red-400' : 'text-slate-400'}`}>
                    {task.deadlineLabel}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-400">{task.durationLabel}</td>
                  <td className={`whitespace-nowrap px-4 py-3 ${task.overdue ? 'text-red-400' : 'text-slate-300'}`}>
                    {remainingLabel(task.deadlineDateTime, task.status, now)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={pct} className="w-20" />
                      <span className="text-xs text-slate-400">{pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={task.status} label={task.statusLabel} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      {task.status === 'IN_PROGRESS' || task.status === 'OVERDUE' ? (
                        <>
                          <button onClick={() => onAction(task.id, 'complete')} className="btn-ghost !px-2.5 !py-1 text-xs">
                            Done
                          </button>
                          <button onClick={() => onAction(task.id, 'cancel')} className="btn-danger !px-2.5 !py-1 text-xs">
                            Cancel
                          </button>
                        </>
                      ) : task.status === 'PENDING_APPROVAL' ? (
                        <button onClick={() => onAction(task.id, 'approve')} className="btn-primary !bg-emerald-600 hover:!bg-emerald-500 !px-2.5 !py-1 text-xs">
                          ✅ Approve
                        </button>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-slate-800 md:hidden">
        {tasks.map((task) => {
          const pct = progress(task, now);
          return (
            <div key={task.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-100">{task.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    👤 {task.handler?.name ?? '—'} · {task.durationLabel}
                  </p>
                </div>
                <StatusBadge status={task.status} label={task.statusLabel} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                <div>
                  <p className="text-slate-600">Start</p>
                  <p>{task.startLabel}</p>
                </div>
                <div>
                  <p className="text-slate-600">Deadline</p>
                  <p className={task.overdue ? 'font-semibold text-red-400' : ''}>{task.deadlineLabel}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-600">Time remaining</p>
                  <p className={task.overdue ? 'text-red-400' : ''}>
                    {remainingLabel(task.deadlineDateTime, task.status, now)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ProgressBar value={pct} />
                <span className="text-xs text-slate-400">{pct}%</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(task.status === 'IN_PROGRESS' || task.status === 'OVERDUE') && (
                  <>
                    <button onClick={() => onAction(task.id, 'complete')} className="btn-ghost !py-1.5 text-xs">Mark Done</button>
                    <button onClick={() => onAction(task.id, 'cancel')} className="btn-danger !py-1.5 text-xs">Cancel</button>
                  </>
                )}
                {task.status === 'PENDING_APPROVAL' && (
                  <button onClick={() => onAction(task.id, 'approve')} className="btn-primary !bg-emerald-600 hover:!bg-emerald-500 !py-1.5 text-xs">
                    ✅ Done / Approved
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
