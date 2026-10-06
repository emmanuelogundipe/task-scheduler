export const STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
  IN_PROGRESS: { badge: 'border-amber-500/30 bg-amber-500/10 text-amber-400', dot: 'bg-amber-400' },
  PENDING_APPROVAL: { badge: 'border-sky-500/30 bg-sky-500/10 text-sky-400', dot: 'bg-sky-400' },
  COMPLETED: { badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400', dot: 'bg-emerald-400' },
  OVERDUE: { badge: 'border-red-500/30 bg-red-500/10 text-red-400', dot: 'bg-red-400' },
  CANCELLED: { badge: 'border-slate-600/40 bg-slate-700/20 text-slate-400', dot: 'bg-slate-500' },
};

export const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'In Progress',
  PENDING_APPROVAL: 'Pending Approval',
  COMPLETED: 'Completed',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.CANCELLED;
  return (
    <span className={`badge ${style.badge}`}>
      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {(label ?? STATUS_LABELS[status] ?? status).toUpperCase()}
    </span>
  );
}
