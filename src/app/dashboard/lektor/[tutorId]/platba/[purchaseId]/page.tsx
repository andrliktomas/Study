import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { cancelPendingPurchase } from "@/app/actions/student";
import { CopyButton } from "@/components/CopyButton";
import { Notice, PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { formatIban, ibanToCzAccount, paymentQr } from "@/lib/bank";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { accountFor, paymentReference } from "@/lib/payments";
import { requireUser } from "@/lib/session";

export default async function TransferPaymentPage(props: { params: Promise<{ tutorId: string; purchaseId: string }> }) {
  const params = await props.params;
  const user = await requireUser();
  const p = await db.purchase.findFirst({
    where: { id: params.purchaseId, studentId: user.id, tutorId: params.tutorId, source: "TRANSFER" },
    include: { tutor: { include: { user: { select: { name: true } }, bankAccounts: true } } },
  });
  if (!p || !p.variableSymbol) notFound();
  const account = accountFor(p.tutor.bankAccounts, p.currency);
  const back = `/dashboard/lektor/${p.tutorId}`;

  if (p.status !== "PENDING" || !account) {
    return (
      <>
        <PageHeader title="Platba převodem" />
        <Notice tone={p.status === "PAID" ? "success" : "warn"}>
          {p.status === "PAID"
            ? "Platba je připsaná – můžete si vybrat termíny lekcí."
            : !account && p.status === "PENDING"
              ? "Lektor už nemá účet v této měně. Napište mu prosím."
              : "Tato objednávka byla zrušena."}
        </Notice>
        <Link href={back} className="btn-primary">Zpět k lektorovi</Link>
      </>
    );
  }

  const reference = paymentReference(p.variableSymbol);
  const message = `${reference} ${p.packageName}`;
  const qr = paymentQr({ iban: account.iban, bic: account.bic, holderName: account.holderName, currency: p.currency, amountCents: p.amountCents, vs: p.variableSymbol, message });
  const svg = qr ? await QRCode.toString(qr.payload, { type: "svg", margin: 1, width: 240, errorCorrectionLevel: "M", color: { dark: "#0f2a2e", light: "#ffffff" } }) : null;
  const czAccount = account.iban ? ibanToCzAccount(account.iban) : null;
  const amount = (p.amountCents / 100).toFixed(2);

  const rows: [string, string, string][] = [
    ["Částka", `${formatMoney(p.amountCents, p.currency)}`, amount],
    ["Měna", p.currency.toUpperCase(), p.currency.toUpperCase()],
    ["Příjemce (majitel účtu)", account.holderName, account.holderName],
    ...(czAccount && p.currency === "czk" ? [["Číslo účtu", czAccount, czAccount] as [string, string, string]] : []),
    ...(account.iban ? [["IBAN", formatIban(account.iban), account.iban] as [string, string, string]] : []),
    ...(account.accountNumber ? [["Číslo účtu", account.accountNumber, account.accountNumber] as [string, string, string]] : []),
    ...(account.bic ? [["SWIFT / BIC", account.bic, account.bic] as [string, string, string]] : []),
    ...(account.bankName ? [["Banka", account.bankName, account.bankName] as [string, string, string]] : []),
    ["Variabilní symbol", p.variableSymbol, p.variableSymbol],
    ["Zpráva / reference", message, message],
  ];

  return (
    <>
      <PageHeader title="Zaplaťte převodem" description={`${p.packageName} · lektor ${p.tutor.user.name}`} />
      <div className={`grid gap-6 ${svg ? "lg:grid-cols-[300px_1fr]" : ""}`}>
        {svg && qr && (
          <div className="card flex flex-col items-center self-start">
            <div className="rounded-xl border border-slate-100 p-2" aria-label="QR kód pro platbu" dangerouslySetInnerHTML={{ __html: svg }} />
            <p className="mt-3 text-center text-sm text-ink-soft">Naskenujte v mobilním bankovnictví.</p>
            <p className="text-center text-xs text-ink-faint">{qr.label}</p>
          </div>
        )}
        <div className="card">
          <dl className="divide-y divide-slate-100 text-sm">
            {rows.map(([label, value, copy]) => (
              <div key={label} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <dt className="text-ink-faint">{label}</dt>
                <dd className="flex items-center gap-2 font-semibold">{value} <CopyButton value={copy} label="Kopírovat" /></dd>
              </div>
            ))}
          </dl>
          {account.note && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-ink-soft"><strong>Poznámka lektora:</strong> {account.note}</p>}
          <div className="mt-4 space-y-2 text-sm text-ink-soft">
            <p>Uveďte prosím variabilní symbol nebo referenci do zprávy pro příjemce, aby lektor platbu poznal.</p>
            {p.currency !== "czk" && (
              <p>
                Platíte-li ze zahraničí, zvolte u poplatků variantu <strong>OUR</strong> (poplatky hradí plátce), aby lektor obdržel celou částku.
                {p.currency === "eur" && " V rámci eurozóny stačí běžný SEPA převod."}
              </p>
            )}
          </div>
          <Notice tone="info">
            Lekce se vám připíšou, jakmile lektor potvrdí, že platba dorazila (u zahraničních převodů to může trvat několik dní). Pošleme vám e-mail.
          </Notice>
          <div className="flex flex-wrap gap-3">
            <Link href={back} className="btn-primary">Hotovo, zaplaceno</Link>
            <form action={cancelPendingPurchase}>
              <input type="hidden" name="purchaseId" value={p.id} />
              <SubmitButton className="btn-ghost text-red-600" pendingText="Ruším…">Zrušit objednávku</SubmitButton>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
