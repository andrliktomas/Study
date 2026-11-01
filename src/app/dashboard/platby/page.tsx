import { confirmTransfer, rejectTransfer, startStripeOnboarding } from "@/app/actions/tutor";
import { Notice, PageHeader, Stat } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { formatIban, ibanToCzAccount } from "@/lib/bank";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { requireTutor } from "@/lib/session";
import { fakePaymentsEnabled, stripe, stripeEnabled } from "@/lib/stripe";
import { BankAccountForm } from "./BankAccountForm";

const SOURCE: Record<string, { label: string; cls: string }> = {
  STRIPE: { label: "Karta", cls: "bg-brand-100 text-brand-800" },
  TRANSFER: { label: "Převod", cls: "bg-indigo-100 text-indigo-800" },
  MANUAL: { label: "Ručně", cls: "bg-amber-100 text-amber-800" },
  DEV: { label: "Test", cls: "bg-slate-100 text-ink-soft" },
};

export default async function PaymentsPage(props: { searchParams: Promise<{ navrat?: string; chyba?: string }> }) {
  const searchParams = await props.searchParams;
  const { user, profile: initialProfile } = await requireTutor();
  let profile = initialProfile;

  // Po návratu z registrace ve Stripe stav účtu rovnou ověříme (webhook může dorazit později).
  if (stripeEnabled && profile.stripeAccountId && (searchParams.navrat || !profile.stripeOnboarded)) {
    const acct = await stripe().accounts.retrieve(profile.stripeAccountId);
    const onboarded = Boolean(acct.charges_enabled && acct.details_submitted);
    if (onboarded !== profile.stripeOnboarded) {
      profile = await db.tutorProfile.update({ where: { id: profile.id }, data: { stripeOnboarded: onboarded } });
    }
  }

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [pending, purchases, month] = await Promise.all([
    db.purchase.findMany({
      where: { tutorId: profile.id, status: "PENDING", source: "TRANSFER" },
      include: { student: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.purchase.findMany({
      where: { tutorId: profile.id, status: { in: ["PAID", "REFUNDED"] } },
      include: { student: { select: { name: true, email: true } } },
      orderBy: { paidAt: "desc" },
      take: 100,
    }),
    db.purchase.aggregate({ where: { tutorId: profile.id, status: "PAID", paidAt: { gte: monthStart } }, _sum: { amountCents: true, refundedCents: true } }),
  ]);
  const total = purchases.reduce((s, p) => s + p.amountCents - p.refundedCents, 0);

  return (
    <>
      <PageHeader title="Platby od studentů" description="Peníze jdou přímo vám – platforma si z lekcí nebere žádnou provizi." />
      {searchParams.chyba === "stripe" && <Notice tone="error">Platby kartou nejsou na serveru nakonfigurovány (chybí STRIPE_SECRET_KEY).</Notice>}
      {fakePaymentsEnabled && <Notice tone="warn">Vývojový režim: platby kartou se simulují a lekce se připíší okamžitě.</Notice>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Převodem s QR kódem</h2>
            <span className={`badge ${profile.bankIban ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-ink-faint"}`}>{profile.bankIban ? "Zapnuto" : "Vypnuto"}</span>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            Student dostane QR kód pro mobilní bankovnictví s variabilním symbolem. Až peníze dorazí, potvrdíte platbu a lekce se mu připíší. Bez poplatků.
          </p>
          {profile.bankIban && (
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
              {ibanToCzAccount(profile.bankIban) ?? ""} <span className="text-ink-faint">· {formatIban(profile.bankIban)}</span>
            </p>
          )}
          <div className="mt-4"><BankAccountForm current={profile.bankIban ? ibanToCzAccount(profile.bankIban) ?? profile.bankIban : ""} /></div>
        </section>

        <section className="card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Kartou přes Stripe</h2>
            <span className={`badge ${profile.stripeOnboarded ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-ink-faint"}`}>{profile.stripeOnboarded ? "Aktivní" : "Nepřipojeno"}</span>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            Studenti zaplatí kartou, Apple Pay nebo Google Pay. Platby jdou na váš vlastní Stripe účet a poplatky Stripe (u evropských karet zhruba 1,5 % + pevná částka) platíte přímo Stripe.
          </p>
          <div className="mt-4">
            {!stripeEnabled ? (
              <p className="text-sm text-ink-faint">Platby kartou nejsou na serveru zapnuté.</p>
            ) : profile.stripeOnboarded ? (
              <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="btn-secondary">Otevřít Stripe ↗</a>
            ) : (
              <form action={startStripeOnboarding}>
                <SubmitButton pendingText="Přesměrovávám…">{profile.stripeAccountId ? "Dokončit nastavení Stripe" : "Připojit Stripe"}</SubmitButton>
              </form>
            )}
          </div>
        </section>
      </div>

      {pending.length > 0 && (
        <section className="card mt-6 border-indigo-200">
          <h2 className="font-semibold">Čeká na platbu převodem ({pending.length})</h2>
          <p className="mt-1 text-sm text-ink-soft">Zkontrolujte ve svém bankovnictví platbu s daným variabilním symbolem a potvrďte ji.</p>
          <ul className="mt-4 divide-y divide-slate-100">
            {pending.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{p.student.name ?? p.student.email} · {p.packageName}</p>
                  <p className="text-ink-faint">VS <strong className="text-ink">{p.variableSymbol}</strong> · {formatMoney(p.amountCents, p.currency)} · objednáno {formatDate(p.createdAt, user.timezone)}</p>
                </div>
                <form action={confirmTransfer}>
                  <input type="hidden" name="purchaseId" value={p.id} />
                  <SubmitButton className="btn-primary px-3 py-1.5 text-xs" pendingText="…">Platba přišla</SubmitButton>
                </form>
                <form action={rejectTransfer}>
                  <input type="hidden" name="purchaseId" value={p.id} />
                  <SubmitButton className="btn-ghost px-3 py-1.5 text-xs text-red-600" pendingText="…">Zrušit</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Stat label="Tento měsíc" value={formatMoney((month._sum.amountCents ?? 0) - (month._sum.refundedCents ?? 0))} />
        <Stat label="Celkem (posledních 100 plateb)" value={formatMoney(total)} hint="po odečtení vrácených částek" />
      </div>

      <div className="card mt-6 overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-ink-faint">
            <tr><th className="p-4 font-medium">Datum</th><th className="p-4 font-medium">Student</th><th className="p-4 font-medium">Balíček</th><th className="p-4 font-medium">Způsob</th><th className="p-4 text-right font-medium">Částka</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {purchases.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-ink-faint">Zatím žádné platby.</td></tr>}
            {purchases.map((p) => (
              <tr key={p.id} className="hover:bg-brand-50/40">
                <td className="p-4 whitespace-nowrap">{p.paidAt && formatDate(p.paidAt, user.timezone)}</td>
                <td className="p-4">{p.student.name ?? p.student.email}</td>
                <td className="p-4">{p.packageName}{p.note && <span className="block text-xs text-ink-faint">{p.note}</span>}</td>
                <td className="p-4"><span className={`badge ${SOURCE[p.source]?.cls}`}>{SOURCE[p.source]?.label ?? p.source}</span></td>
                <td className="p-4 text-right font-semibold">
                  {formatMoney(p.amountCents, p.currency)}
                  {p.refundedCents > 0 && <span className="block text-xs font-normal text-red-600">vráceno {formatMoney(p.refundedCents, p.currency)}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
