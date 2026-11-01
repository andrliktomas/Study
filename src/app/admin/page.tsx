import { subDays } from "date-fns";
import Link from "next/link";
import { PageHeader, Stat } from "@/components/PageHeader";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { PLANS, effectivePlan } from "@/lib/plans";

export default async function AdminHome() {
  const since = subDays(new Date(), 30);
  const [users, tutors, lessons30, volume30, recent] = await Promise.all([
    db.user.count({ where: { deletedAt: null } }),
    db.tutorProfile.findMany({
      select: { id: true, plan: true, subscriptionStatus: true, published: true, suspended: true, cancelAtPeriodEnd: true, _count: { select: { enrollments: { where: { archivedAt: null } } } } },
    }),
    db.lesson.count({ where: { status: "COMPLETED", startsAt: { gte: since } } }),
    db.purchase.aggregate({ where: { status: "PAID", paidAt: { gte: since }, source: { in: ["STRIPE", "TRANSFER"] } }, _sum: { amountCents: true } }),
    db.tutorProfile.findMany({
      where: { stripeSubscriptionId: { not: null } },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
  ]);

  const withPlan = tutors.map((t) => ({ ...t, eff: effectivePlan(t) }));
  const paying = withPlan.filter((t) => t.eff.priceCents > 0);
  const mrr = paying.reduce((s, t) => s + t.eff.priceCents, 0);
  const atLimit = withPlan.filter((t) => t.eff.maxStudents !== null && t._count.enrollments >= t.eff.maxStudents);
  const pastDue = tutors.filter((t) => t.subscriptionStatus === "past_due").length;
  const churning = tutors.filter((t) => t.cancelAtPeriodEnd).length;

  return (
    <>
      <PageHeader title="Přehled platformy" description="Příjem platformy = předplatné lektorů. Z lekcí si nebereme provizi." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="MRR (měsíční příjem)" value={formatMoney(mrr)} hint={`${paying.length} platících lektorů`} />
        <Stat label="Lektoři na limitu" value={atLimit.length} hint="příležitost k navýšení tarifu" />
        <Stat label="Problémy s platbou" value={pastDue} hint={`${churning} ruší předplatné`} />
        <Stat label="Odučeno lekcí (30 dní)" value={lessons30} />
        <Stat label="Uživatelů" value={users} />
        <Stat label="Lektorů" value={tutors.length} hint={`${tutors.filter((t) => t.published && !t.suspended).length} veřejných`} />
        <Stat label="Platby lekcí (30 dní)" value={formatMoney(volume30._sum?.amountCents ?? 0)} hint="kartou a převodem, jen pro přehled" />
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
            <h2 className="font-semibold">Předplatitelé</h2>
            <Link href="/admin/lektori" className="text-sm text-brand-600 hover:underline">Všichni lektoři →</Link>
          </div>
          <ul className="mt-4 divide-y divide-slate-100 text-sm">
            {recent.map((t) => (
              <li key={t.id} className="flex flex-wrap justify-between gap-2 py-2.5">
                <span>{t.user.name} <span className="text-ink-faint">· {t.user.email}</span></span>
                <span className="text-ink-faint">
                  {effectivePlan(t).name} · {t.subscriptionStatus}
                  {t.currentPeriodEnd && ` · do ${formatDate(t.currentPeriodEnd)}`}
                </span>
              </li>
            ))}
            {recent.length === 0 && <li className="py-2 text-ink-faint">Zatím žádní.</li>}
          </ul>
        </div>
      </div>
    </>
  );
}
