export function StatCard({
  label,
  value,
  accent = 'text-slate-100',
  icon,
  hint,
}: {
  label: string;
  value: number | string;
  accent?: string;
  icon?: string;
  hint?: string;
}) {
  return (
    <div className="card !p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
