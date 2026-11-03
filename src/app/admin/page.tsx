import { subDays } from "date-fns";
import Link from "next/link";
import { PageHeader, Stat } from "@/components/PageHeader";
import { parseParty } from "@/lib/billing";
import { db } from "@/lib/db";
import { formatDate, formatMoney, formatTotals } from "@/lib/format";
import { PLANS, effectivePlan, planPrice } from "@/lib/plans";
import { requireAdmin } from "@/lib/session";

export default async function AdminHome() {
  // kontrola i ve stránce: layout se při klientské navigaci nemusí znovu vykonat
  await requireAdmin();
  const now = new Date();
  const since = subDays(now, 30);
  const [users, tutors, lessons30, openInvoices, expired30, paid30, recentPaid] = await Promise.all([
    db.user.count({ where: { deletedAt: null } }),
    db.tutorProfile.findMany({
      select: { id: true, plan: true, planActiveUntil: true, paidUntil: true, nextPlan: true, billingCurrency: true, published: true, suspended: true, _count: { select: { enrollments: { where: { archivedAt: null } } } } },
    }),
    db.lesson.count({ where: { status: "COMPLETED", startsAt: { gte: since } } }),
    db.invoice.findMany({ where: { status: "ISSUED" }, select: { amountCents: true, currency: true, dueAt: true } }),
    db.invoice.count({ where: { status: "EXPIRED", dueAt: { gte: since } } }),
    db.invoice.findMany({ where: { status: "PAID", paidAt: { gte: since } }, select: { amountCents: true, currency: true } }),
    db.invoice.findMany({ where: { status: "PAID" }, orderBy: { paidAt: "desc" }, take: 8 }),
  ]);

  const withPlan = tutors.map((t) => ({ ...t, eff: effectivePlan(t, now) }));
  // MRR = zaplacená předplatná, která se budou obnovovat
  const recurring = withPlan.filter((t) => t.eff.id !== "FREE" && t.paidUntil && t.paidUntil > now && t.nextPlan !== "FREE");
  const mrr = formatTotals(recurring.map((t) => ({ amountCents: planPrice(t.eff, t.billingCurrency), currency: t.billingCurrency })));
  const atLimit = withPlan.filter((t) => t.eff.maxStudents !== null && t._count.enrollments >= t.eff.maxStudents);
  const overdueSoon = openInvoices.filter((i) => i.dueAt < now).length;

  return (
    <>
      <PageHeader title="Přehled platformy" description="Příjem platformy = předplatné lektorů placené převodem na fakturu. Z lekcí si nebereme provizi." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="MRR (měsíční příjem)" value={mrr} hint={`${recurring.length} zaplacených předplatných`} />
        <Stat label="Přijato za 30 dní" value={formatTotals(paid30)} />
        <Stat label="Faktury k úhradě" value={openInvoices.length} hint={`${formatTotals(openInvoices)}${overdueSoon ? ` · ${overdueSoon} po splatnosti` : ""}`} />
        <Stat label="Neuhrazené (30 dní)" value={expired30} hint="tarif spadl na Zdarma" />
        <Stat label="Lektoři na limitu" value={atLimit.length} hint="příležitost k navýšení tarifu" />
        <Stat label="Odučeno lekcí (30 dní)" value={lessons30} />
        <Stat label="Uživatelů" value={users} />
        <Stat label="Lektorů" value={tutors.length} hint={`${tutors.filter((t) => t.published && !t.suspended).length} veřejných`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="font-semibold">Rozložení tarifů</h2>
          <ul className="mt-4 space-y-3">
            {PLANS.map((p) => {
              const n = withPlan.filter((t) => t.eff.id === p.id).length;
              const pct = tutors.length ? Math.round((n / tutors.length) * 100) : 0;
              return (
                <li key={p.id}>
                  <div className="flex justify-between text-sm"><span>{p.name}</span><span className="font-semibold">{n}</span></div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-brand-50"><div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} /></div>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Poslední přijaté platby</h2>
            <Link href="/admin/fakturace" className="text-sm text-brand-600 hover:underline">Fakturace →</Link>
          </div>
          <ul className="mt-4 divide-y divide-slate-100 text-sm">
            {recentPaid.map((inv) => (
              <li key={inv.id} className="flex flex-wrap justify-between gap-2 py-2.5">
                <span>{inv.number} · {parseParty(inv.customer).name}</span>
                <span className="text-ink-faint">{inv.paidAt && formatDate(inv.paidAt)} · <strong className="text-ink">{formatMoney(inv.amountCents, inv.currency)}</strong></span>
              </li>
            ))}
            {recentPaid.length === 0 && <li className="py-2 text-ink-faint">Zatím žádné.</li>}
          </ul>
        </div>
      </div>
    </>
  );
}
