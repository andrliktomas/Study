export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-ink-faint">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "error" | "success"; children: React.ReactNode }) {
  const cls = {
    info: "border-brand-200 bg-brand-50 text-brand-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
    error: "border-red-200 bg-red-50 text-red-800",
  }[tone];
  return <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${cls}`}>{children}</div>;
}

export function CreditBar({ remaining, total }: { remaining: number; total: number }) {
  const pct = total > 0 ? Math.round((remaining / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-ink-soft">Zbývá lekcí</span>
        <span className="font-semibold">{remaining} / {total}</span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-brand-50" role="progressbar" aria-valuenow={remaining} aria-valuemin={0} aria-valuemax={total}>
        <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const STATUS: Record<string, { label: string; cls: string }> = {
  SCHEDULED: { label: "Naplánováno", cls: "bg-brand-100 text-brand-800" },
  COMPLETED: { label: "Proběhla", cls: "bg-emerald-100 text-emerald-800" },
  CANCELLED: { label: "Zrušena", cls: "bg-slate-100 text-ink-faint" },
  NO_SHOW: { label: "Nedostavil se", cls: "bg-amber-100 text-amber-800" },
};

export function LessonStatus({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.SCHEDULED;
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}
