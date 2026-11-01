export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Načítám">
      <div className="h-8 w-56 rounded-lg bg-slate-100" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-100" />)}
      </div>
      <div className="h-64 rounded-2xl bg-slate-100" />
    </div>
  );
}
