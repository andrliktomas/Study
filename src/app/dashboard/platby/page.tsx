import { confirmTransfer, deleteBankAccount, rejectTransfer } from "@/app/actions/tutor";
import { Notice, PageHeader, Stat } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { formatIban, ibanToCzAccount } from "@/lib/bank";
import { CURRENCIES, currencyLabel } from "@/lib/currencies";
import { db } from "@/lib/db";
import { formatDate, formatMoney, formatTotals } from "@/lib/format";
import { paymentReference } from "@/lib/payments";
import { requireTutor } from "@/lib/session";
import { BankAccountForm } from "./BankAccountForm";

const SOURCE: Record<string, { label: string; cls: string }> = {
  TRANSFER: { label: "Převod", cls: "bg-indigo-100 text-indigo-800" },
  MANUAL: { label: "Ručně", cls: "bg-amber-100 text-amber-800" },
  STRIPE: { label: "Karta", cls: "bg-slate-100 text-ink-soft" },
};

export default async function PaymentsPage(props: { searchParams: Promise<{ chyba?: string; ulozeno?: string }> }) {
  const searchParams = await props.searchParams;
  const { user, profile } = await requireTutor();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [accounts, packages, pending, purchases, month] = await Promise.all([
    db.tutorBankAccount.findMany({ where: { tutorId: profile.id }, orderBy: { createdAt: "asc" } }),
    db.lessonPackage.findMany({ where: { tutorId: profile.id, active: true }, select: { currency: true } }),
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
    db.purchase.findMany({ where: { tutorId: profile.id, status: "PAID", paidAt: { gte: monthStart } }, select: { amountCents: true, refundedCents: true, currency: true } }),
  ]);
  const net = (rows: { amountCents: number; refundedCents: number; currency: string }[]) => rows.map((r) => ({ amountCents: r.amountCents - r.refundedCents, currency: r.currency }));
  const missing = [...new Set(packages.map((p) => p.currency))].filter((c) => !accounts.some((a) => a.currency === c));
  const freeCurrencies = CURRENCIES.filter((c) => !accounts.some((a) => a.currency === c.code));

  return (
    <>
      <PageHeader title="Platby od studentů" description="Studenti platí převodem přímo na váš účet – i ze zahraničí. Platforma si z lekcí nebere nic." />
      {searchParams.ulozeno && (
        <Notice tone="success">Účet pro {searchParams.ulozeno.toUpperCase()} uložen. Studenti teď mohou platit převodem v této měně.</Notice>
      )}
      {searchParams.chyba === "cekajici" && <Notice tone="error">Účet nelze smazat – v jeho měně čekají nepotvrzené platby.</Notice>}
      {accounts.length === 0 && (
        <Notice tone="warn">Přidejte bankovní účet, jinak si u vás studenti nemohou nic koupit a profil nepůjde zveřejnit.</Notice>
      )}
      {missing.length > 0 && (
        <Notice tone="warn">
          Máte balíčky v měně {missing.map((c) => c.toUpperCase()).join(", ")}, ale pro ni nemáte účet – tyto balíčky studenti nevidí.
        </Notice>
      )}

      <section className="card">
        <h2 className="font-semibold">Vaše bankovní účty</h2>
        <p className="mt-1 max-w-3xl text-sm text-ink-soft">
          Pro každou měnu, ve které prodáváte lekce, jeden účet. Studentům ukážeme IBAN, SWIFT/BIC a referenci platby; u CZK na český účet
          i QR Platbu a u EUR QR kód pro SEPA převod.
        </p>
        {accounts.length > 0 && (
          <ul className="mt-5 grid gap-4 md:grid-cols-2">
            {accounts.map((a) => (
              <li key={a.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{currencyLabel(a.currency)}</p>
                    <p className="text-sm text-ink-soft">{a.holderName}{a.bankName && ` · ${a.bankName}`}</p>
                  </div>
                  <form action={deleteBankAccount}>
                    <input type="hidden" name="currency" value={a.currency} />
                    <SubmitButton className="btn-ghost px-2 py-1 text-xs text-red-600" pendingText="…">Odebrat</SubmitButton>
                  </form>
                </div>
                <dl className="mt-3 space-y-1 text-sm">
                  {a.iban && <div className="flex gap-2"><dt className="w-24 text-ink-faint">IBAN</dt><dd className="font-medium">{formatIban(a.iban)}</dd></div>}
                  {a.iban && ibanToCzAccount(a.iban) && <div className="flex gap-2"><dt className="w-24 text-ink-faint">Číslo účtu</dt><dd>{ibanToCzAccount(a.iban)}</dd></div>}
                  {a.accountNumber && <div className="flex gap-2"><dt className="w-24 text-ink-faint">Číslo účtu</dt><dd className="font-medium">{a.accountNumber}</dd></div>}
                  {a.bic && <div className="flex gap-2"><dt className="w-24 text-ink-faint">SWIFT/BIC</dt><dd>{a.bic}</dd></div>}
                  {a.note && <div className="flex gap-2"><dt className="w-24 text-ink-faint">Poznámka</dt><dd>{a.note}</dd></div>}
                </dl>
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-brand-600">Upravit</summary>
                  <div className="mt-3">
                    <BankAccountForm
                      currencies={[{ code: a.currency, label: currencyLabel(a.currency) }]}
                      initial={{ currency: a.currency, holderName: a.holderName, account: a.iban ?? a.accountNumber ?? "", bic: a.bic ?? "", bankName: a.bankName ?? "", note: a.note ?? "" }}
                    />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
        {freeCurrencies.length > 0 && (
          <details className="mt-5 rounded-xl bg-brand-50/60 p-4" open={accounts.length === 0}>
            <summary className="cursor-pointer font-medium text-brand-700">+ Přidat účet</summary>
            <div className="mt-4 max-w-xl">
              <BankAccountForm
                key={freeCurrencies.map((c) => c.code).join()}
                currencies={freeCurrencies.map((c) => ({ code: c.code, label: currencyLabel(c.code) }))}
                initial={{ currency: freeCurrencies[0].code, holderName: profile.legalName ?? user.name ?? "", account: "", bic: "", bankName: "", note: "" }}
              />
            </div>
          </details>
        )}
      </section>

      {pending.length > 0 && (
        <section className="card mt-6 border-indigo-200">
          <h2 className="font-semibold">Čeká na platbu převodem ({pending.length})</h2>
          <p className="mt-1 text-sm text-ink-soft">Zkontrolujte v bankovnictví platbu s daným variabilním symbolem nebo referencí a potvrďte ji.</p>
          <ul className="mt-4 divide-y divide-slate-100">
            {pending.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{p.student.name ?? p.student.email} · {p.packageName}</p>
                  <p className="text-ink-faint">
                    VS <strong className="text-ink">{p.variableSymbol}</strong> / ref. {paymentReference(p.variableSymbol!)} · <strong className="text-ink">{formatMoney(p.amountCents, p.currency)}</strong> · objednáno {formatDate(p.createdAt, user.timezone)}
                  </p>
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
        <Stat label="Tento měsíc" value={formatTotals(net(month))} />
        <Stat label="Celkem (posledních 100 plateb)" value={formatTotals(net(purchases))} hint="po odečtení vrácených částek" />
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
                <td className="whitespace-nowrap p-4">{p.paidAt && formatDate(p.paidAt, user.timezone)}</td>
                <td className="p-4">{p.student.name ?? p.student.email}</td>
                <td className="p-4">{p.packageName}{p.note && <span className="block text-xs text-ink-faint">{p.note}</span>}</td>
                <td className="p-4"><span className={`badge ${SOURCE[p.source]?.cls ?? ""}`}>{SOURCE[p.source]?.label ?? p.source}</span></td>
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
