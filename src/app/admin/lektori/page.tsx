import Link from "next/link";
import { setTutorSuspended } from "@/app/actions/admin";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { db } from "@/lib/db";
import { effectivePlan } from "@/lib/plans";

export default async function AdminTutors({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q?.trim();
  const tutors = await db.tutorProfile.findMany({
    where: q
      ? {
          OR: [
            { user: { name: { contains: q, mode: "insensitive" } } },
            { user: { email: { contains: q, mode: "insensitive" } } },
            { slug: { contains: q, mode: "insensitive" } },
          ],
        }
      : {},
    include: { user: true, _count: { select: { enrollments: { where: { archivedAt: null } } } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const year = new Date().getFullYear();

  return (
    <>
      <PageHeader
        title="Lektoři"
        description={`${tutors.length} lektorů`}
        actions={
          <div className="flex gap-2">
            <a href={`/api/admin/dac7?rok=${year - 1}`} className="btn-secondary">Export DAC7 {year - 1}</a>
            <a href={`/api/admin/dac7?rok=${year}`} className="btn-ghost">{year} (průběžně)</a>
          </div>
        }
      />
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={q} placeholder="Hledat jméno, e-mail…" className="input max-w-sm" /><button className="btn-secondary">Hledat</button></form>
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-ink-faint">
            <tr><th className="p-3 font-medium">Lektor</th><th className="p-3 font-medium">Stav</th><th className="p-3 font-medium">Tarif</th><th className="p-3 text-right font-medium">Studenti</th><th className="p-3 font-medium">Platby</th><th className="p-3 font-medium">Údaje DAC7</th><th className="p-3" /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tutors.map((t) => {
              const plan = effectivePlan(t);
              const atLimit = plan.maxStudents !== null && t._count.enrollments >= plan.maxStudents;
              return (
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
                  <td className="p-3">
                    {plan.name}
                    {t.subscriptionStatus && t.subscriptionStatus !== "active" && <span className="block text-xs text-amber-700">{t.subscriptionStatus}</span>}
                    {t.cancelAtPeriodEnd && <span className="block text-xs text-ink-faint">ruší</span>}
                  </td>
                  <td className={`p-3 text-right ${atLimit ? "font-semibold text-amber-700" : ""}`}>{t._count.enrollments} / {plan.maxStudents ?? "∞"}</td>
                  <td className="p-3 text-xs text-ink-soft">{[t.bankIban && "převod", t.stripeOnboarded && "karta"].filter(Boolean).join(", ") || "—"}</td>
                  <td className="p-3 text-xs">{t.legalName && t.street && (t.companyId || t.birthDate) ? "✓" : <span className="text-amber-700">chybí</span>}</td>
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
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
