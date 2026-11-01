import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { cancelPendingPurchase } from "@/app/actions/student";
import { CopyButton } from "@/components/CopyButton";
import { Notice, PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { formatIban, ibanToCzAccount, spaydString } from "@/lib/bank";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { requireUser } from "@/lib/session";

export default async function TransferPaymentPage({ params }: { params: { tutorId: string; purchaseId: string } }) {
  const user = await requireUser();
  const p = await db.purchase.findFirst({
    where: { id: params.purchaseId, studentId: user.id, tutorId: params.tutorId, source: "TRANSFER" },
    include: { tutor: { include: { user: { select: { name: true } } } } },
  });
  if (!p || !p.tutor.bankIban || !p.variableSymbol) notFound();
  const back = `/dashboard/lektor/${p.tutorId}`;

  if (p.status !== "PENDING") {
    return (
      <>
        <PageHeader title="Platba převodem" />
        <Notice tone={p.status === "PAID" ? "success" : "warn"}>
          {p.status === "PAID" ? "Platba je připsaná – můžete si vybrat termíny lekcí." : "Tato objednávka byla zrušena."}
        </Notice>
        <Link href={back} className="btn-primary">Zpět k lektorovi</Link>
      </>
    );
  }

  const message = `${p.packageName} ${user.name ?? ""}`.trim();
  const spayd = spaydString({ iban: p.tutor.bankIban, amountCents: p.amountCents, currency: p.currency, vs: p.variableSymbol, message });
  const qr = await QRCode.toString(spayd, { type: "svg", margin: 1, width: 240, errorCorrectionLevel: "M", color: { dark: "#0f2a2e", light: "#ffffff" } });
  const account = ibanToCzAccount(p.tutor.bankIban);

  return (
    <>
      <PageHeader title="Zaplaťte převodem" description={`${p.packageName} · lektor ${p.tutor.user.name}`} />
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="card flex flex-col items-center">
          <div className="rounded-xl border border-slate-100 p-2" aria-label="QR kód pro platbu" dangerouslySetInnerHTML={{ __html: qr }} />
          <p className="mt-3 text-center text-sm text-ink-soft">Naskenujte v mobilním bankovnictví (QR Platba).</p>
        </div>
        <div className="card">
          <dl className="divide-y divide-slate-100 text-sm">
            {[
              ["Částka", formatMoney(p.amountCents, p.currency), (p.amountCents / 100).toString()],
              ["Číslo účtu", account ?? formatIban(p.tutor.bankIban), account ?? p.tutor.bankIban],
              ["IBAN", formatIban(p.tutor.bankIban), p.tutor.bankIban],
              ["Variabilní symbol", p.variableSymbol, p.variableSymbol],
              ["Zpráva pro příjemce", message, message],
            ].map(([label, value, copy]) => (
              <div key={label} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <dt className="text-ink-faint">{label}</dt>
                <dd className="flex items-center gap-2 font-semibold">{value} <CopyButton value={copy} label="Kopírovat" /></dd>
              </div>
            ))}
          </dl>
          <Notice tone="info">
            Lekce se vám připíšou, jakmile lektor potvrdí, že platba dorazila (obvykle do 1–2 pracovních dnů). Pošleme vám e-mail.
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
