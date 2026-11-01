import type { LessonPackage } from "@prisma/client";
import { formatMoney, pluralLessons } from "@/lib/format";
import { BuyButtons } from "./BuyButtons";

export function PackageList({
  packages,
  returnTo,
  payment,
}: {
  packages: LessonPackage[];
  returnTo: string;
  payment: { card: boolean; transfer: boolean };
}) {
  if (packages.length === 0) return <p className="mt-4 text-sm text-ink-faint">Lektor zatím nenastavil žádné balíčky.</p>;
  return (
    <ul className="mt-4 space-y-3">
      {packages.map((p) => {
        const perLesson = Math.round(p.priceCents / p.lessonCount);
        return (
          <li key={p.id} className={`rounded-xl border p-4 transition hover:border-brand-300 hover:shadow-soft ${p.isTrial ? "border-brand-200 bg-brand-50/60" : "border-slate-100"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-xs text-ink-faint">
                  {p.lessonCount} {pluralLessons(p.lessonCount)} · {p.durationMin} min
                  {p.lessonCount > 1 && <> · {formatMoney(perLesson, p.currency)}/lekce</>}
                  {p.validityDays && <> · platnost {p.validityDays} dní</>}
                </p>
              </div>
              <p className="whitespace-nowrap text-lg font-bold text-brand-700">{formatMoney(p.priceCents, p.currency)}</p>
            </div>
            {p.description && <p className="mt-2 text-sm text-ink-soft">{p.description}</p>}
            <BuyButtons packageId={p.id} returnTo={returnTo} payment={payment} />
          </li>
        );
      })}
    </ul>
  );
}
