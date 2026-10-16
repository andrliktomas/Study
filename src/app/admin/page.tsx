import { subDays } from "date-fns";
import Link from "next/link";
import { PageHeader, Stat } from "@/components/PageHeader";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";

export default async function AdminHome() {
  const since = subDays(new Date(), 30);
  const paidCard = { status: "PAID", source: "STRIPE" };
  const [users, tutors, published, gmv, gmv30, manualSettled, owed, lessons30, recent] = await Promise.all([
    db.user.count(),
    db.tutorProfile.count(),
    db.tutorProfile.count({ where: { published: true, suspended: false } }),
    db.purchase.aggregate({ where: paidCard, _sum: { amountCents: true, platformFeeCents: true } }),
    db.purchase.aggregate({ where: { ...paidCard, paidAt: { gte: since } }, _sum: { amountCents: true, platformFeeCents: true } }),
    db.purchase.aggregate({ where: { source: "MANUAL", status: "PAID", feeSettledAt: { not: null } }, _sum: { platformFeeCents: true } }),
    db.purchase.aggregate({ where: { source: "MANUAL", status: "PAID", feeSettledAt: null }, _sum: { platformFeeCents: true }, _count: true }),
    db.lesson.count({ where: { status: "COMPLETED", startsAt: { gte: since } } }),
    db.purchase.findMany({
      where: { status: "PAID" },
      include: { student: { select: { name: true } }, tutor: { include: { user: { select: { name: true } } } } },
      orderBy: { paidAt: "desc" },
      take: 10,
    }),
  ]);
  const revenue = (gmv._sum.platformFeeCents ?? 0) + (manualSettled._sum.platformFeeCents ?? 0);

  return (
    <>
      <PageHeader title="Přehled platformy" description="Částky v CZK (platby v jiných měnách jsou sečteny bez přepočtu)." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Obrat přes platformu" value={formatMoney(gmv._sum.amountCents ?? 0)} hint={`posledních 30 dní: ${formatMoney(gmv30._sum.amountCents ?? 0)}`} />
        <Stat label="Vaše provize celkem" value={formatMoney(revenue)} hint={`posledních 30 dní (karty): ${formatMoney(gmv30._sum.platformFeeCents ?? 0)}`} />
        <Stat label="Dlužné provize (ruční)" value={formatMoney(owed._sum.platformFeeCents ?? 0)} hint={`${owed._count} nevyrovnaných záznamů`} />
        <Stat label="Odučeno lekcí (30 dní)" value={lessons30} />
        <Stat label="Uživatelů" value={users} />
        <Stat label="Lektorů" value={tutors} hint={`${published} veřejných`} />
      </div>
      <div className="card mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Poslední platby</h2>
          <Link href="/admin/platby" className="text-sm text-brand-600 hover:underline">Všechny →</Link>
        </div>
        <ul className="mt-4 divide-y divide-slate-100 text-sm">
          {recent.map((p) => (
            <li key={p.id} className="flex flex-wrap justify-between gap-2 py-2.5">
              <span>{p.student.name} → {p.tutor.user.name} · {p.packageName}</span>
              <span className="text-ink-faint">{p.paidAt && formatDate(p.paidAt)} · <strong className="text-ink">{formatMoney(p.amountCents, p.currency)}</strong></span>
            </li>
          ))}
          {recent.length === 0 && <li className="py-2 text-ink-faint">Zatím žádné.</li>}
        </ul>
      </div>
    </>
  );
}
