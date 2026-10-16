import { openStripeDashboard, startStripeOnboarding } from "@/app/actions/tutor";
import { Notice, PageHeader, Stat } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { requireTutor } from "@/lib/session";
import { platformFeePercent } from "@/lib/site";
import { fakePaymentsEnabled, stripe, stripeEnabled } from "@/lib/stripe";

export default async function PayoutsPage({ searchParams }: { searchParams: { navrat?: string; chyba?: string } }) {
  const { user, profile: initialProfile } = await requireTutor();
  let profile = initialProfile;

  // Po návratu z onboardingu stav účtu rovnou ověříme (webhook může dorazit později).
  if (stripeEnabled && profile.stripeAccountId && (searchParams.navrat || !profile.stripeOnboarded)) {
    const acct = await stripe().accounts.retrieve(profile.stripeAccountId);
    const onboarded = Boolean(acct.charges_enabled && acct.details_submitted);
    if (onboarded !== profile.stripeOnboarded) {
      profile = await db.tutorProfile.update({ where: { id: profile.id }, data: { stripeOnboarded: onboarded } });
    }
  }

  const purchases = await db.purchase.findMany({
    where: { tutorId: profile.id, status: { in: ["PAID", "REFUNDED"] } },
    include: { student: { select: { name: true, email: true } } },
    orderBy: { paidAt: "desc" },
    take: 50,
  });
  const paid = purchases.filter((p) => p.status === "PAID");
  const gross = paid.reduce((s, p) => s + p.amountCents, 0);
  const fees = paid.reduce((s, p) => s + p.platformFeeCents, 0);

  return (
    <>
      <PageHeader title="Platby a výplaty" description={`Studenti platí kartou, peníze jdou přímo na váš účet. Provize platformy: ${platformFeePercent()} %.`} />
      {searchParams.chyba === "stripe" && <Notice tone="error">Stripe není na serveru nakonfigurován (chybí STRIPE_SECRET_KEY).</Notice>}
      {fakePaymentsEnabled && <Notice tone="warn">Vývojový režim: Stripe není nastaven, platby se simulují a lekce se připíší okamžitě.</Notice>}

      <div className="card mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={`grid h-10 w-10 place-items-center rounded-full text-lg ${profile.stripeOnboarded ? "bg-emerald-100" : "bg-amber-100"}`}>
            {profile.stripeOnboarded ? "✓" : "!"}
          </span>
          <div>
            <p className="font-semibold">{profile.stripeOnboarded ? "Přijímání plateb je aktivní" : "Přijímání plateb není aktivní"}</p>
            <p className="text-sm text-ink-soft">
              {profile.stripeOnboarded ? "Výplaty chodí na váš bankovní účet podle nastavení Stripe." : "Dokud nepropojíte Stripe, studenti u vás nemohou zaplatit."}
            </p>
          </div>
        </div>
        {stripeEnabled && (
          profile.stripeOnboarded ? (
            <form action={openStripeDashboard}><SubmitButton className="btn-secondary" pendingText="Otevírám…">Otevřít Stripe přehled</SubmitButton></form>
          ) : (
            <form action={startStripeOnboarding}><SubmitButton pendingText="Přesměrovávám…">{profile.stripeAccountId ? "Dokončit nastavení" : "Propojit Stripe"}</SubmitButton></form>
          )
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Prodeje celkem" value={formatMoney(gross)} />
        <Stat label="Provize platformy" value={formatMoney(fees)} />
        <Stat label="Váš příjem" value={formatMoney(gross - fees)} hint="před poplatky Stripe" />
      </div>

      <div className="card mt-6 overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-ink-faint">
            <tr><th className="p-4 font-medium">Datum</th><th className="p-4 font-medium">Student</th><th className="p-4 font-medium">Balíček</th><th className="p-4 text-right font-medium">Cena</th><th className="p-4 text-right font-medium">Provize</th><th className="p-4 text-right font-medium">Vám</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {purchases.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-ink-faint">Zatím žádné platby.</td></tr>}
            {purchases.map((p) => (
              <tr key={p.id} className={`hover:bg-brand-50/40 ${p.status === "REFUNDED" ? "text-ink-faint line-through" : ""}`}>
                <td className="p-4">{p.paidAt && formatDate(p.paidAt, user.timezone)}</td>
                <td className="p-4">{p.student.name ?? p.student.email}</td>
                <td className="p-4">{p.packageName}</td>
                <td className="p-4 text-right">{formatMoney(p.amountCents, p.currency)}</td>
                <td className="p-4 text-right text-ink-faint">{formatMoney(p.platformFeeCents, p.currency)}</td>
                <td className="p-4 text-right font-semibold">{formatMoney(p.amountCents - p.platformFeeCents, p.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
