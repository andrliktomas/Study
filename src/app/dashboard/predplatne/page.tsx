import Link from "next/link";
import { choosePlan } from "@/app/actions/billing";
import { Notice, PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { billingAccount, invoicePaymentText } from "@/lib/billing";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { PLANS, PLAN_FEATURES, activeStudentCount, effectivePlan, planById, planPrice } from "@/lib/plans";
import { requireTutor } from "@/lib/session";
import { operatorAccounts } from "@/lib/site";
import { BillingDetailsForm } from "./BillingDetailsForm";

const STATUS: Record<string, { label: string; cls: string }> = {
  ISSUED: { label: "K úhradě", cls: "bg-amber-100 text-amber-800" },
  PAID: { label: "Zaplaceno", cls: "bg-emerald-100 text-emerald-800" },
  EXPIRED: { label: "Neuhrazeno", cls: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Stornováno", cls: "bg-slate-100 text-ink-faint" },
};

export default async function SubscriptionPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const searchParams = await props.searchParams;
  const { user, profile } = await requireTutor();
  const plan = effectivePlan(profile);
  const [count, invoices] = await Promise.all([
    activeStudentCount(profile.id),
    db.invoice.findMany({ where: { tutorId: profile.id }, orderBy: { issuedAt: "desc" }, take: 24 }),
  ]);
  const open = invoices.filter((i) => i.status === "ISSUED");
  const pct = plan.maxStudents ? Math.min(100, Math.round((count / plan.maxStudents) * 100)) : 100;
  const currency = profile.billingCurrency;
  const paidActive = Boolean(profile.paidUntil && profile.paidUntil > new Date());
  const missingBilling = !profile.legalName || !profile.street;
  const currencies = operatorAccounts().map((a) => a.currency);

  return (
    <>
      <PageHeader title="Předplatné" description="Platíte podle počtu aktivních studentů, převodem na fakturu. Z lekcí si nebereme žádnou provizi." />
      {searchParams.ok && <Notice tone="success">{searchParams.ok}</Notice>}
      {searchParams.chyba && <Notice tone="error">{searchParams.chyba}</Notice>}

      {open.map((inv) => (
        <div key={inv.id} className="card mb-6 border-amber-200 bg-amber-50/40">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">Faktura {inv.number} čeká na úhradu</p>
              <p className="text-sm text-ink-soft">Tarif {planById(inv.plan).name} · splatnost {formatDate(inv.dueAt, user.timezone)}</p>
            </div>
            <Link href={`/dashboard/predplatne/faktura/${inv.id}`} className="btn-primary">Zobrazit fakturu a QR</Link>
          </div>
          <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-ink-soft">{invoicePaymentText(inv)}</pre>
          <p className="mt-2 text-xs text-ink-faint">Platbu spárujeme podle variabilního symbolu, obvykle do 1–2 pracovních dnů od připsání.</p>
        </div>
      ))}

      <section className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-ink-faint">Váš tarif</p>
            <p className="text-2xl font-bold">{plan.name}</p>
            <p className="text-sm text-ink-soft">
              {plan.id === "FREE"
                ? "zdarma"
                : `${formatMoney(planPrice(plan, currency), currency)} měsíčně`}
              {plan.id !== "FREE" && paidActive && (
                <> · zaplaceno do {formatDate(profile.paidUntil!, user.timezone)}</>
              )}
              {plan.id !== "FREE" && !paidActive && profile.planActiveUntil && (
                <> · platí do splatnosti faktury {formatDate(profile.planActiveUntil, user.timezone)}</>
              )}
            </p>
            {profile.nextPlan && paidActive && (
              <p className="mt-1 text-sm text-amber-700">
                {profile.nextPlan === "FREE"
                  ? `Předplatné skončí ${formatDate(profile.paidUntil!, user.timezone)}.`
                  : `Od ${formatDate(profile.paidUntil!, user.timezone)} přejdete na tarif ${planById(profile.nextPlan).name}.`}
              </p>
            )}
          </div>
          {profile.nextPlan && paidActive && (
            <form action={choosePlan}>
              <input type="hidden" name="plan" value={profile.plan} />
              <SubmitButton className="btn-secondary">Ponechat tarif {planById(profile.plan).name}</SubmitButton>
            </form>
          )}
        </div>
        <div className="mt-5">
          <div className="flex justify-between text-sm">
            <span className="text-ink-soft">Aktivní studenti</span>
            <span className="font-semibold">{count} / {plan.maxStudents ?? "∞"}</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-brand-50">
            <div className={`h-full rounded-full transition-all ${pct >= 100 && plan.maxStudents ? "bg-amber-500" : "bg-gradient-to-r from-brand-400 to-brand-600"}`} style={{ width: `${plan.maxStudents ? pct : 8}%` }} />
          </div>
          <p className="hint">Archivovaní studenti se nepočítají. Archivovat je můžete na jejich kartě.</p>
        </div>
      </section>

      {missingBilling && (
        <Notice tone="warn">Před výběrem placeného tarifu vyplňte fakturační údaje níže – použijeme je na faktuře.</Notice>
      )}
      {!billingAccount(currency) && <Notice tone="error">Fakturaci v {currency.toUpperCase()} zatím nepodporujeme – zvolte jinou měnu níže.</Notice>}

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((p) => {
          const current = p.id === plan.id;
          const price = planPrice(p, currency);
          const tooSmall = p.maxStudents !== null && count > p.maxStudents;
          return (
            <div key={p.id} className={`card relative flex flex-col ${p.highlight ? "border-brand-300 shadow-glow" : ""} ${current ? "ring-2 ring-brand-400" : ""}`}>
              {p.highlight && <span className="badge absolute right-4 top-4 bg-brand-500 text-white">Oblíbený</span>}
              <h2 className="text-lg font-semibold">{p.name}</h2>
              <p className="mt-2 whitespace-nowrap text-3xl font-extrabold">{formatMoney(price, currency)}</p>
              <p className="text-sm text-ink-faint">měsíčně</p>
              <p className="mt-1 text-sm font-medium text-brand-700">{p.maxStudents ? `až ${p.maxStudents} aktivních studentů` : "neomezeně studentů"}</p>
              <div className="mt-auto pt-5">
                {current ? (
                  <span className="btn-secondary w-full cursor-default">Aktuální tarif</span>
                ) : (
                  <form action={choosePlan}>
                    <input type="hidden" name="plan" value={p.id} />
                    <SubmitButton
                      className={p.highlight ? "btn-primary w-full" : "btn-secondary w-full"}
                      pendingText="Ukládám…"
                    >
                      {tooSmall ? `Archivujte ${count - (p.maxStudents ?? 0)} studentů` : price > planPrice(plan, currency) ? "Přejít výš" : p.id === "FREE" ? "Zrušit předplatné" : "Přejít níž"}
                    </SubmitButton>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-soft">
        {PLAN_FEATURES.map((f) => <li key={f}>✓ {f}</li>)}
      </ul>
      <p className="mt-2 text-xs text-ink-faint">
        Vyšší tarif platí hned (doplatíte jen zbytek období), nižší tarif a zrušení platí od dalšího období. Fakturu na další měsíc vystavíme
        7 dní předem, splatnost je 7 dní od začátku období.
      </p>

      {invoices.length > 0 && (
        <section className="card mt-8 overflow-x-auto p-0">
          <h2 className="px-6 pt-5 font-semibold">Faktury</h2>
          <table className="mt-3 w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-ink-faint">
              <tr><th className="px-6 py-3 font-medium">Číslo</th><th className="px-6 py-3 font-medium">Období</th><th className="px-6 py-3 font-medium">Stav</th><th className="px-6 py-3 text-right font-medium">Částka</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-brand-50/40">
                  <td className="px-6 py-3"><Link href={`/dashboard/predplatne/faktura/${inv.id}`} className="font-medium text-brand-700 hover:underline">{inv.number}</Link></td>
                  <td className="px-6 py-3 text-ink-soft">{formatDate(inv.periodStart, user.timezone)} – {formatDate(inv.periodEnd, user.timezone)}</td>
                  <td className="px-6 py-3"><span className={`badge ${STATUS[inv.status]?.cls}`}>{STATUS[inv.status]?.label}</span></td>
                  <td className="px-6 py-3 text-right font-semibold">{formatMoney(inv.amountCents, inv.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="card mt-8">
        <h2 className="font-semibold">Fakturační a daňové údaje</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Použijeme je na faktury za předplatné. Jako provozovatel platformy můžeme být podle pravidel EU (DAC7) povinni jednou ročně
          hlásit finanční správě tyto údaje spolu s přehledem vašich příjmů z lekcí sjednaných přes platformu.
        </p>
        <div className="mt-5">
          <BillingDetailsForm
            currencies={currencies.length ? currencies : ["czk"]}
            initial={{
              legalName: profile.legalName ?? user.name ?? "",
              street: profile.street ?? "",
              cityName: profile.cityName ?? "",
              zip: profile.zip ?? "",
              country: profile.country,
              companyId: profile.companyId ?? "",
              vatId: profile.vatId ?? "",
              birthDate: profile.birthDate ? profile.birthDate.toISOString().slice(0, 10) : "",
              billingCurrency: profile.billingCurrency,
            }}
          />
        </div>
      </section>
    </>
  );
}
