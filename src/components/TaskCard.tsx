'use client';

type Task = {
  id: number;
  title: string;
  description: string;
  status: string;
  startTime: string;
  durationMinutes: number;
  deadline: string;
  completedAt: string | null;
  handler: { name: string; whatsapp: string };
};

const STATUS_STYLES: Record<string, string> = {
  IN_PROGRESS: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  PENDING_APPROVAL: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
  COMPLETED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
};

export default function TaskCard({
  task,
  onChangeStatus,
}: {
  task: Task;
  onChangeStatus: (id: number, action: 'submit' | 'approve') => void;
}) {
  const start = new Date(task.startTime);
  const deadline = new Date(task.deadline);
  const now = new Date();

  // Live progress for in-progress tasks
  const elapsedMin = (now.getTime() - start.getTime()) / 60000;
  const pct =
    task.status === 'COMPLETED'
      ? 100
      : Math.min(100, Math.max(0, (elapsedMin / task.durationMinutes) * 100));
  const overdue = task.status === 'IN_PROGRESS' && now > deadline;

  return (
    <article className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-100">{task.title}</h3>
          <p className="mt-0.5 text-sm text-slate-400">
            👤 {task.handler.name} · {task.handler.whatsapp}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[task.status] ?? ''}`}
        >
          {task.status.replace(/_/g, ' ')}
        </span>
      </div>

      {task.description && (
        <p className="whitespace-pre-wrap text-sm text-slate-400">{task.description}</p>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 sm:grid-cols-4">
        <div>
          <p className="font-semibold uppercase tracking-wide text-slate-600">Start</p>
          <p>{start.toLocaleString()}</p>
        </div>
        <div>
          <p className="font-semibold uppercase tracking-wide text-slate-600">Duration</p>
          <p>{task.durationMinutes} min</p>
        </div>
        <div>
          <p className="font-semibold uppercase tracking-wide text-slate-600">Deadline</p>
          <p className={overdue ? 'font-semibold text-red-400' : ''}>
            {deadline.toLocaleString()}
            {overdue && ' ⚠️'}
          </p>
        </div>
        <div>
          <p className="font-semibold uppercase tracking-wide text-slate-600">Completed</p>
          <p>{task.completedAt ? new Date(task.completedAt).toLocaleString() : '—'}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="mb-1 flex justify-between text-xs text-slate-500">
          <span>Elapsed</span>
          <span>{Math.floor(pct)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-all ${
              pct >= 100 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-brand-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Workflow actions */}
      <div className="flex flex-wrap gap-2 pt-1">
        {task.status === 'IN_PROGRESS' && (
          <button
            onClick={() => onChangeStatus(task.id, 'submit')}
            className="btn-ghost !py-1.5 text-xs"
          >
            📤 Submit for Approval
          </button>
        )}
        {task.status === 'PENDING_APPROVAL' && (
          <button
            onClick={() => onChangeStatus(task.id, 'approve')}
            className="btn-primary !bg-emerald-600 hover:!bg-emerald-500 !py-1.5 text-xs"
          >
            ✅ Done / Approved
          </button>
        )}
        {task.status === 'COMPLETED' && (
          <span className="text-xs text-slate-600">
            All automated reminders for this task have been halted.
          </span>
        )}
      </div>
    </article>
  );
}
