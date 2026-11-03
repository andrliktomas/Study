import Link from "next/link";
import { adminCancelInvoice, adminMarkInvoicePaid } from "@/app/actions/admin";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { parseParty } from "@/lib/billing";
import { db } from "@/lib/db";
import { formatDate, formatMoney, formatTotals } from "@/lib/format";
import { planById } from "@/lib/plans";
import { requireAdmin } from "@/lib/session";

const FILTERS = [
  { key: "k-uhrade", label: "K úhradě", where: { status: "ISSUED" } },
  { key: "neuhrazene", label: "Neuhrazené po splatnosti", where: { status: "EXPIRED" } },
  { key: "zaplacene", label: "Zaplacené", where: { status: "PAID" } },
  { key: "vse", label: "Vše", where: {} },
];
const STATUS: Record<string, { label: string; cls: string }> = {
  ISSUED: { label: "K úhradě", cls: "bg-amber-100 text-amber-800" },
  PAID: { label: "Zaplaceno", cls: "bg-emerald-100 text-emerald-800" },
  EXPIRED: { label: "Neuhrazeno", cls: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Storno", cls: "bg-slate-100 text-ink-faint" },
};

export default async function AdminInvoices(props: { searchParams: Promise<{ f?: string; q?: string }> }) {
  // kontrola i ve stránce: layout se při klientské navigaci nemusí znovu vykonat
  await requireAdmin();
  const searchParams = await props.searchParams;
  const filter = FILTERS.find((x) => x.key === searchParams.f) ?? FILTERS[0];
  const q = searchParams.q?.trim();
  const invoices = await db.invoice.findMany({
    where: { ...filter.where, ...(q ? { number: { contains: q } } : {}) },
    include: { tutor: { include: { user: { select: { email: true } } } } },
    orderBy: { issuedAt: "desc" },
    take: 300,
  });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        title="Fakturace předplatného"
        description="Spárujte platby z bankovního výpisu podle variabilního symbolu (= číslo faktury) a označte je jako zaplacené."
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex flex-wrap rounded-xl bg-brand-50 p-1 text-sm font-medium">
          {FILTERS.map((x) => (
            <Link key={x.key} href={`/admin/fakturace?f=${x.key}`} className={`rounded-lg px-3.5 py-1.5 ${filter.key === x.key ? "bg-white text-brand-700 shadow-soft" : "text-ink-soft hover:text-brand-700"}`}>{x.label}</Link>
          ))}
        </div>
        <form className="flex gap-2">
          <input type="hidden" name="f" value="vse" />
          <input name="q" defaultValue={q} placeholder="Variabilní symbol…" className="input w-48" />
          <button className="btn-secondary">Hledat</button>
        </form>
      </div>
      <p className="mb-3 text-sm text-ink-soft">Celkem v tomto výběru: <strong>{formatTotals(invoices)}</strong></p>
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-ink-faint">
            <tr><th className="p-3 font-medium">VS / číslo</th><th className="p-3 font-medium">Lektor</th><th className="p-3 font-medium">Tarif</th><th className="p-3 font-medium">Splatnost</th><th className="p-3 font-medium">Stav</th><th className="p-3 text-right font-medium">Částka</th><th className="p-3" /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-ink-faint">Nic tu není.</td></tr>}
            {invoices.map((inv) => {
              const customer = parseParty(inv.customer);
              return (
                <tr key={inv.id} className="hover:bg-brand-50/40">
                  <td className="p-3"><Link href={`/admin/fakturace/${inv.id}`} className="font-medium text-brand-700 hover:underline">{inv.number}</Link></td>
                  <td className="p-3">{customer.name}<span className="block text-xs text-ink-faint">{inv.tutor?.user.email ?? "účet smazán"}</span></td>
                  <td className="p-3">{planById(inv.plan).name}<span className="block text-xs text-ink-faint">{inv.kind === "UPGRADE" ? "doplatek" : inv.kind === "RENEWAL" ? "obnova" : "první období"}</span></td>
                  <td className="whitespace-nowrap p-3">{formatDate(inv.dueAt)}{inv.paidAt && <span className="block text-xs text-ink-faint">zapl. {formatDate(inv.paidAt)}</span>}</td>
                  <td className="p-3"><span className={`badge ${STATUS[inv.status]?.cls}`}>{STATUS[inv.status]?.label}</span></td>
                  <td className="p-3 text-right font-semibold">{formatMoney(inv.amountCents, inv.currency)}</td>
                  <td className="p-3">
                    {(inv.status === "ISSUED" || inv.status === "EXPIRED") && (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <form action={adminMarkInvoicePaid} className="flex items-center gap-1">
                          <input type="hidden" name="invoiceId" value={inv.id} />
                          <input type="date" name="paidAt" defaultValue={today} className="input w-36 py-1 text-xs" aria-label="Datum platby" />
                          <SubmitButton className="btn-primary px-3 py-1.5 text-xs" pendingText="…">Zaplaceno</SubmitButton>
                        </form>
                        {inv.status === "ISSUED" && (
                          <form action={adminCancelInvoice}>
                            <input type="hidden" name="invoiceId" value={inv.id} />
                            <SubmitButton className="btn-ghost px-2 py-1.5 text-xs text-red-600" pendingText="…">Storno</SubmitButton>
                          </form>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
