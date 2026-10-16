import { togglePackage } from "@/app/actions/tutor";
import { PageHeader } from "@/components/PageHeader";
import { db } from "@/lib/db";
import { formatMoney, pluralLessons } from "@/lib/format";
import { requireTutor } from "@/lib/session";
import { platformFeePercent } from "@/lib/site";
import { PackageForm } from "./PackageForm";

export default async function PackagesPage() {
  const { profile } = await requireTutor();
  const packages = await db.lessonPackage.findMany({
    where: { tutorId: profile.id },
    orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { priceCents: "asc" }],
    include: { _count: { select: { purchases: { where: { status: "PAID" } } } } },
  });
  const fee = platformFeePercent();

  return (
    <>
      <PageHeader title="Balíčky a ceny" description={`Co si u vás mohou studenti koupit. Z každé platby si platforma strhne ${fee} %.`} />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {packages.length === 0 && <div className="card text-sm text-ink-faint">Zatím nemáte žádný balíček. Začněte třeba zkušební lekcí a balíčkem 5 lekcí.</div>}
          {packages.map((p) => (
            <details key={p.id} className={`card group ${p.active ? "" : "opacity-60"}`}>
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
                <div className="flex-1">
                  <p className="font-semibold">
                    {p.name} {p.isTrial && <span className="badge ml-1 bg-brand-100 text-brand-800">Zkušební</span>}
                    {!p.active && <span className="badge ml-1 bg-slate-100 text-ink-faint">Skrytý</span>}
                  </p>
                  <p className="text-sm text-ink-faint">
                    {p.lessonCount} {pluralLessons(p.lessonCount)} · {p.durationMin} min · prodáno {p._count.purchases}×
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-brand-700">{formatMoney(p.priceCents, p.currency)}</p>
                  <p className="text-xs text-ink-faint">vám: {formatMoney(p.priceCents - Math.round((p.priceCents * fee) / 100), p.currency)}</p>
                </div>
                <span className="text-sm text-brand-600 group-open:hidden">Upravit</span>
              </summary>
              <div className="mt-5 border-t border-slate-100 pt-5">
                <PackageForm pkg={{ ...p, price: p.priceCents / 100 }} />
                <form action={togglePackage} className="mt-3">
                  <input type="hidden" name="id" value={p.id} />
                  <button className="btn-ghost text-xs">{p.active ? "Skrýt balíček" : "Znovu zobrazit"}</button>
                </form>
              </div>
            </details>
          ))}
        </div>
        <div className="card self-start">
          <h2 className="mb-4 font-semibold">Nový balíček</h2>
          <PackageForm />
        </div>
      </div>
    </>
  );
}
