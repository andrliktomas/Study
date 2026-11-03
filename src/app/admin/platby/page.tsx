import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

const FILTERS = [
  { key: "vse", label: "Vše" },
  { key: "karta", label: "Karty", source: "STRIPE" },
  { key: "prevod", label: "Převody", source: "TRANSFER" },
  { key: "rucni", label: "Ručně připsané", source: "MANUAL" },
];
const SRC: Record<string, string> = { STRIPE: "Karta", TRANSFER: "Převod", MANUAL: "Ručně", DEV: "Test" };

export default async function AdminPayments(props: { searchParams: Promise<{ f?: string }> }) {
  // kontrola i ve stránce: layout se při klientské navigaci nemusí znovu vykonat
  await requireAdmin();
  const searchParams = await props.searchParams;
  const filter = FILTERS.find((x) => x.key === searchParams.f) ?? FILTERS[0];
  const purchases = await db.purchase.findMany({
    where: { status: { in: ["PAID", "REFUNDED"] }, ...(filter.source ? { source: filter.source } : {}) },
    include: { student: { select: { name: true, email: true } }, tutor: { include: { user: { select: { name: true } } } } },
    orderBy: { paidAt: "desc" },
    take: 300,
  });

  return (
    <>
      <PageHeader title="Platby za lekce" description="Jen pro přehled a hlášení DAC7 – peníze jdou přímo lektorům, platforma si nic nestrhává." />
      <div className="mb-4 inline-flex flex-wrap rounded-xl bg-brand-50 p-1 text-sm font-medium">
        {FILTERS.map((x) => (
          <Link key={x.key} href={`/admin/platby?f=${x.key}`} className={`rounded-lg px-3.5 py-1.5 ${filter.key === x.key ? "bg-white text-brand-700 shadow-soft" : "text-ink-soft hover:text-brand-700"}`}>{x.label}</Link>
        ))}
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-ink-faint">
            <tr><th className="p-3 font-medium">Datum</th><th className="p-3 font-medium">Lektor</th><th className="p-3 font-medium">Student</th><th className="p-3 font-medium">Položka</th><th className="p-3 font-medium">Způsob</th><th className="p-3 text-right font-medium">Částka</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {purchases.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-ink-faint">Nic tu není.</td></tr>}
            {purchases.map((p) => (
              <tr key={p.id} className="hover:bg-brand-50/40">
                <td className="p-3 whitespace-nowrap">{p.paidAt && formatDate(p.paidAt)}</td>
                <td className="p-3">{p.tutor.user.name}</td>
                <td className="p-3">{p.student.name ?? p.student.email}</td>
                <td className="p-3">{p.packageName}{p.note && <span className="block text-xs text-ink-faint">„{p.note}“</span>}</td>
                <td className="p-3"><span className="badge bg-slate-100 text-ink-soft">{SRC[p.source] ?? p.source}</span></td>
                <td className="p-3 text-right font-medium">
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
