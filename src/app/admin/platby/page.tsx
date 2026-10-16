import Link from "next/link";
import { settleFee } from "@/app/actions/admin";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";

const FILTERS = [
  { key: "vse", label: "Vše" },
  { key: "karta", label: "Karty" },
  { key: "rucni", label: "Ručně připsané" },
  { key: "dluzne", label: "Dlužné provize" },
];

export default async function AdminPayments({ searchParams }: { searchParams: { f?: string } }) {
  const f = FILTERS.some((x) => x.key === searchParams.f) ? searchParams.f! : "vse";
  const where =
    f === "karta" ? { source: "STRIPE" } : f === "rucni" ? { source: "MANUAL" } : f === "dluzne" ? { source: "MANUAL", feeSettledAt: null, platformFeeCents: { gt: 0 } } : {};
  const purchases = await db.purchase.findMany({
    where: { status: { in: ["PAID", "REFUNDED"] }, ...where },
    include: { student: { select: { name: true, email: true } }, tutor: { include: { user: { select: { name: true, email: true } } } } },
    orderBy: { paidAt: "desc" },
    take: 300,
  });
  const SRC: Record<string, string> = { STRIPE: "Karta", MANUAL: "Ručně", DEV: "Test" };

  return (
    <>
      <PageHeader title="Platby a provize" />
      <div className="mb-4 inline-flex flex-wrap rounded-xl bg-brand-50 p-1 text-sm font-medium">
        {FILTERS.map((x) => (
          <Link key={x.key} href={`/admin/platby?f=${x.key}`} className={`rounded-lg px-3.5 py-1.5 ${f === x.key ? "bg-white text-brand-700 shadow-soft" : "text-ink-soft hover:text-brand-700"}`}>{x.label}</Link>
        ))}
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-ink-faint">
            <tr><th className="p-3 font-medium">Datum</th><th className="p-3 font-medium">Lektor</th><th className="p-3 font-medium">Student</th><th className="p-3 font-medium">Položka</th><th className="p-3 font-medium">Zdroj</th><th className="p-3 text-right font-medium">Částka</th><th className="p-3 text-right font-medium">Provize</th><th className="p-3" /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {purchases.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-ink-faint">Nic tu není.</td></tr>}
            {purchases.map((p) => (
              <tr key={p.id} className={`hover:bg-brand-50/40 ${p.status === "REFUNDED" ? "text-ink-faint line-through" : ""}`}>
                <td className="p-3 whitespace-nowrap">{p.paidAt && formatDate(p.paidAt)}</td>
                <td className="p-3">{p.tutor.user.name}</td>
                <td className="p-3">{p.student.name ?? p.student.email}</td>
                <td className="p-3">{p.packageName}{p.note && <span className="block text-xs text-ink-faint">„{p.note}“</span>}</td>
                <td className="p-3"><span className={`badge ${p.source === "MANUAL" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-ink-soft"}`}>{SRC[p.source] ?? p.source}</span></td>
                <td className="p-3 text-right">{formatMoney(p.amountCents, p.currency)}</td>
                <td className="p-3 text-right font-medium">{formatMoney(p.platformFeeCents, p.currency)}</td>
                <td className="p-3 text-right">
                  {p.source === "MANUAL" && p.platformFeeCents > 0 && (p.feeSettledAt ? (
                    <span className="text-xs text-emerald-700">uhrazeno {formatDate(p.feeSettledAt)}</span>
                  ) : (
                    <form action={settleFee}>
                      <input type="hidden" name="purchaseId" value={p.id} />
                      <SubmitButton className="btn-secondary px-3 py-1.5 text-xs" pendingText="…">Označit uhrazené</SubmitButton>
                    </form>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
