import Link from "next/link";
import { setTutorSuspended } from "@/app/actions/admin";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";

export default async function AdminTutors({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q?.trim();
  const tutors = await db.tutorProfile.findMany({
    where: q ? { OR: [{ user: { name: { contains: q } } }, { user: { email: { contains: q } } }, { slug: { contains: q } }] } : {},
    include: { user: true, _count: { select: { enrollments: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const sums = await db.purchase.groupBy({ by: ["tutorId"], where: { status: "PAID" }, _sum: { amountCents: true } });
  const owed = await db.purchase.groupBy({ by: ["tutorId"], where: { status: "PAID", source: "MANUAL", feeSettledAt: null }, _sum: { platformFeeCents: true } });
  const sumMap = new Map(sums.map((s) => [s.tutorId, s._sum.amountCents ?? 0]));
  const owedMap = new Map(owed.map((s) => [s.tutorId, s._sum.platformFeeCents ?? 0]));

  return (
    <>
      <PageHeader title="Lektoři" description={`${tutors.length} lektorů`} />
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={q} placeholder="Hledat jméno, e-mail…" className="input max-w-sm" /><button className="btn-secondary">Hledat</button></form>
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-ink-faint">
            <tr><th className="p-3 font-medium">Lektor</th><th className="p-3 font-medium">Stav</th><th className="p-3 font-medium">Stripe</th><th className="p-3 text-right font-medium">Studentů</th><th className="p-3 text-right font-medium">Prodeje</th><th className="p-3 text-right font-medium">Dluží provizi</th><th className="p-3" /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tutors.map((t) => (
              <tr key={t.id} className="hover:bg-brand-50/40">
                <td className="p-3">
                  <p className="font-medium">{t.user.name}</p>
                  <p className="text-xs text-ink-faint">{t.user.email}</p>
                </td>
                <td className="p-3">
                  {t.suspended ? <span className="badge bg-red-100 text-red-700">Pozastaven</span> : t.published ? (
                    <Link href={`/lektori/${t.slug}`} className="badge bg-emerald-100 text-emerald-800 hover:underline">Veřejný ↗</Link>
                  ) : <span className="badge bg-slate-100 text-ink-faint">Skrytý</span>}
                </td>
                <td className="p-3">{t.stripeOnboarded ? "✓" : <span className="text-ink-faint">—</span>}</td>
                <td className="p-3 text-right">{t._count.enrollments}</td>
                <td className="p-3 text-right">{formatMoney(sumMap.get(t.id) ?? 0)}</td>
                <td className={`p-3 text-right ${(owedMap.get(t.id) ?? 0) > 0 ? "font-semibold text-amber-700" : "text-ink-faint"}`}>{formatMoney(owedMap.get(t.id) ?? 0)}</td>
                <td className="p-3 text-right">
                  <form action={setTutorSuspended}>
                    <input type="hidden" name="tutorId" value={t.id} />
                    <input type="hidden" name="suspended" value={t.suspended ? "0" : "1"} />
                    <SubmitButton className={t.suspended ? "btn-secondary px-3 py-1.5 text-xs" : "btn-danger px-3 py-1.5 text-xs"} pendingText="…">
                      {t.suspended ? "Obnovit" : "Pozastavit"}
                    </SubmitButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
