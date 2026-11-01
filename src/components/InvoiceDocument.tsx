import type { Invoice } from "@prisma/client";
import QRCode from "qrcode";
import { formatIban, paymentQr } from "@/lib/bank";
import { parseParty } from "@/lib/billing";
import { formatDate, formatMoney } from "@/lib/format";
import { planById } from "@/lib/plans";
import { site } from "@/lib/site";
import { PrintButton } from "./PrintButton";

const STATUS: Record<string, { label: string; cls: string }> = {
  ISSUED: { label: "K úhradě", cls: "bg-amber-100 text-amber-800" },
  PAID: { label: "Zaplaceno", cls: "bg-emerald-100 text-emerald-800" },
  EXPIRED: { label: "Po splatnosti – neuhrazeno", cls: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Stornováno", cls: "bg-slate-100 text-ink-faint" },
};

const KIND: Record<string, string> = { FIRST: "", RENEWAL: "", UPGRADE: " – doplatek za změnu tarifu" };

export async function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  const supplier = parseParty(invoice.supplier);
  const customer = parseParty(invoice.customer);
  const account = supplier.account;
  const vat = invoice.vatRate > 0;
  const base = vat ? Math.round(invoice.amountCents / (1 + invoice.vatRate / 100)) : invoice.amountCents;
  const qr =
    account && invoice.status !== "PAID" && invoice.status !== "CANCELLED"
      ? paymentQr({ iban: account.iban, bic: account.bic, holderName: account.holderName, currency: invoice.currency, amountCents: invoice.amountCents, vs: invoice.number, message: `Faktura ${invoice.number}` })
      : null;
  const svg = qr ? await QRCode.toString(qr.payload, { type: "svg", margin: 1, width: 150, color: { dark: "#0f2a2e", light: "#ffffff" } }) : null;
  const status = STATUS[invoice.status] ?? STATUS.ISSUED;

  const Party = ({ title, p }: { title: string; p: typeof supplier }) => (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">{title}</p>
      <p className="mt-1 font-semibold">{p.name}</p>
      {p.lines.map((l) => <p key={l} className="text-sm text-ink-soft">{l}</p>)}
      {p.companyId && <p className="text-sm text-ink-soft">IČO: {p.companyId}</p>}
      {p.vatId && <p className="text-sm text-ink-soft">DIČ: {p.vatId}</p>}
      {p.email && <p className="text-sm text-ink-soft">{p.email}</p>}
    </div>
  );

  return (
    <article className="card mx-auto max-w-3xl p-8 print:max-w-none print:border-0 print:p-0 print:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-faint">{site.name}</p>
          <h1 className="text-2xl font-bold">{vat ? "Faktura – daňový doklad" : "Faktura"} č. {invoice.number}</h1>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <span className={`badge ${status.cls}`}>{status.label}</span>
          <PrintButton />
        </div>
      </div>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <Party title="Dodavatel" p={supplier} />
        <Party title="Odběratel" p={customer} />
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-4">
        <div><dt className="text-ink-faint">Datum vystavení</dt><dd className="font-medium">{formatDate(invoice.issuedAt)}</dd></div>
        {vat && <div><dt className="text-ink-faint">DUZP</dt><dd className="font-medium">{formatDate(invoice.issuedAt)}</dd></div>}
        <div><dt className="text-ink-faint">Splatnost</dt><dd className="font-medium">{formatDate(invoice.dueAt)}</dd></div>
        <div><dt className="text-ink-faint">Variabilní symbol</dt><dd className="font-medium">{invoice.number}</dd></div>
        {invoice.paidAt && <div><dt className="text-ink-faint">Uhrazeno</dt><dd className="font-medium">{formatDate(invoice.paidAt)}</dd></div>}
      </dl>

      <table className="mt-8 w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-ink-faint">
          <tr><th className="py-2 font-medium">Položka</th><th className="py-2 text-right font-medium">{vat ? "Základ" : "Cena"}</th>{vat && <th className="py-2 text-right font-medium">DPH {invoice.vatRate} %</th>}<th className="py-2 text-right font-medium">Celkem</th></tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-100">
            <td className="py-3">
              Předplatné {site.name} – tarif {planById(invoice.plan).name}{KIND[invoice.kind]}
              <span className="block text-xs text-ink-faint">období {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}</span>
            </td>
            <td className="py-3 text-right">{formatMoney(base, invoice.currency)}</td>
            {vat && <td className="py-3 text-right">{formatMoney(invoice.amountCents - base, invoice.currency)}</td>}
            <td className="py-3 text-right font-semibold">{formatMoney(invoice.amountCents, invoice.currency)}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-4 text-right text-lg">Celkem k úhradě: <strong>{formatMoney(invoice.amountCents, invoice.currency)}</strong></p>
      {!vat && <p className="mt-1 text-right text-xs text-ink-faint">Dodavatel není plátcem DPH.</p>}

      {account && (
        <div className="mt-8 flex flex-wrap items-start gap-6 rounded-xl bg-slate-50 p-5 print:bg-transparent print:p-0">
          <dl className="flex-1 space-y-1 text-sm">
            <p className="mb-2 font-semibold">Platební údaje</p>
            <div className="flex gap-2"><dt className="w-32 text-ink-faint">Příjemce</dt><dd>{account.holderName}</dd></div>
            <div className="flex gap-2"><dt className="w-32 text-ink-faint">IBAN</dt><dd className="font-medium">{formatIban(account.iban)}</dd></div>
            {account.bic && <div className="flex gap-2"><dt className="w-32 text-ink-faint">SWIFT/BIC</dt><dd>{account.bic}</dd></div>}
            {account.bankName && <div className="flex gap-2"><dt className="w-32 text-ink-faint">Banka</dt><dd>{account.bankName}</dd></div>}
            <div className="flex gap-2"><dt className="w-32 text-ink-faint">Variabilní symbol</dt><dd className="font-medium">{invoice.number}</dd></div>
            <div className="flex gap-2"><dt className="w-32 text-ink-faint">Částka</dt><dd className="font-medium">{formatMoney(invoice.amountCents, invoice.currency)}</dd></div>
          </dl>
          {svg && (
            <div className="text-center">
              <div className="rounded-lg border border-slate-200 bg-white p-1" aria-label="QR kód pro platbu" dangerouslySetInnerHTML={{ __html: svg }} />
              <p className="mt-1 text-xs text-ink-faint">{qr?.label}</p>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
