export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="bg-grid absolute inset-0 -z-10" aria-hidden />
      <div className="container-page flex justify-center py-16">
        <div className="card w-full max-w-md animate-fade-up p-8">
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-ink-soft">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function Divider() {
  return (
    <div className="my-6 flex items-center gap-3 text-xs text-ink-faint">
      <span className="h-px flex-1 bg-slate-100" /> nebo e-mailem <span className="h-px flex-1 bg-slate-100" />
    </div>
  );
}
