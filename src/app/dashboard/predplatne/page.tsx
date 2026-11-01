import { choosePlan, openBillingPortal, resumeSubscription } from "@/app/actions/billing";
import { Notice, PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { formatDate, formatMoney } from "@/lib/format";
import { PLANS, PLAN_FEATURES, activeStudentCount, effectivePlan, planById } from "@/lib/plans";
import { requireTutor } from "@/lib/session";
import { stripeEnabled } from "@/lib/stripe";
import { BillingDetailsForm } from "./BillingDetailsForm";

export default async function SubscriptionPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const { user, profile } = await requireTutor();
  const plan = effectivePlan(profile);
  const count = await activeStudentCount(profile.id);
  const pct = plan.maxStudents ? Math.min(100, Math.round((count / plan.maxStudents) * 100)) : 100;

  return (
    <>
      <PageHeader title="Předplatné" description="Platíte podle počtu aktivních studentů. Z lekcí si nebereme žádnou provizi." />
      {searchParams.zaplaceno && <Notice tone="success">Děkujeme! Předplatné je aktivní (stav se může projevit během pár sekund).</Notice>}
      {searchParams.zmeneno && <Notice tone="success">Tarif byl změněn.</Notice>}
      {searchParams.zruseno && <Notice tone="info">Předplatné skončí na konci zaplaceného období, pak přejdete na tarif Zdarma.</Notice>}
      {searchParams.chyba === "limit" && (
        <Notice tone="error">
          Tarif {planById(searchParams.tarif).name} je pro {planById(searchParams.tarif).maxStudents} studentů, vy jich máte {count} aktivních. Nejdřív některé archivujte.
        </Notice>
      )}
      {searchParams.chyba === "stripe" && <Notice tone="error">Platby předplatného nejsou na serveru nakonfigurovány.</Notice>}
      {profile.subscriptionStatus === "past_due" && (
        <Notice tone="error">Poslední platba předplatného se nepovedla. Aktualizujte prosím platební kartu, jinak tarif přejde na Zdarma.</Notice>
      )}

      <section className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-ink-faint">Váš tarif</p>
            <p className="text-2xl font-bold">{plan.name}</p>
            <p className="text-sm text-ink-soft">
              {plan.priceCents ? `${formatMoney(plan.priceCents)} měsíčně` : "zdarma"}
              {profile.currentPeriodEnd && plan.id !== "FREE" && (
                <> · {profile.cancelAtPeriodEnd ? "končí" : "další platba"} {formatDate(profile.currentPeriodEnd, user.timezone)}</>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.cancelAtPeriodEnd && (
              <form action={resumeSubscription}><SubmitButton className="btn-primary">Obnovit předplatné</SubmitButton></form>
            )}
            {stripeEnabled && profile.stripeCustomerId && (
              <form action={openBillingPortal}><SubmitButton className="btn-secondary" pendingText="Otevírám…">Platební karta a faktury</SubmitButton></form>
            )}
          </div>
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

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((p) => {
          const current = p.id === plan.id;
          const tooSmall = p.maxStudents !== null && count > p.maxStudents;
          return (
            <div key={p.id} className={`card relative flex flex-col ${p.highlight ? "border-brand-300 shadow-glow" : ""} ${current ? "ring-2 ring-brand-400" : ""}`}>
              {p.highlight && <span className="badge absolute right-4 top-4 bg-brand-500 text-white">Oblíbený</span>}
              <h2 className="text-lg font-semibold">{p.name}</h2>
              <p className="mt-2 text-3xl font-extrabold">{p.priceCents ? formatMoney(p.priceCents) : "0 Kč"}<span className="text-sm font-normal text-ink-faint"> / měsíc</span></p>
              <p className="mt-1 text-sm font-medium text-brand-700">{p.maxStudents ? `až ${p.maxStudents} aktivních studentů` : "neomezeně studentů"}</p>
              <div className="mt-auto pt-5">
                {current ? (
                  <span className="btn-secondary w-full cursor-default">Aktuální tarif</span>
                ) : (
                  <form action={choosePlan}>
                    <input type="hidden" name="plan" value={p.id} />
                    <SubmitButton className={p.highlight ? "btn-primary w-full" : "btn-secondary w-full"} pendingText="Přesměrovávám…">
                      {tooSmall ? `Archivujte ${count - (p.maxStudents ?? 0)} studentů` : p.priceCents > plan.priceCents ? "Přejít výš" : "Přejít níž"}
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

      <section className="card mt-8">
        <h2 className="font-semibold">Fakturační a daňové údaje</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Použijeme je na faktury za předplatné. Jako provozovatel platformy je ze zákona (směrnice EU DAC7) musíme jednou ročně
          hlásit finanční správě spolu s přehledem vašich příjmů z lekcí přes platformu.
        </p>
        <div className="mt-5">
          <BillingDetailsForm
            initial={{
              legalName: profile.legalName ?? user.name ?? "",
              street: profile.street ?? "",
              cityName: profile.cityName ?? "",
              zip: profile.zip ?? "",
              country: profile.country,
              companyId: profile.companyId ?? "",
              vatId: profile.vatId ?? "",
              birthDate: profile.birthDate ? profile.birthDate.toISOString().slice(0, 10) : "",
            }}
          />
        </div>
      </section>
    </>
  );
}
