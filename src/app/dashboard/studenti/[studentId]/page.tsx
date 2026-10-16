import { notFound } from "next/navigation";
import { updateStudentNotes } from "@/app/actions/tutor";
import { Avatar } from "@/components/Avatar";
import { LessonCard } from "@/components/LessonCard";
import { CreditBar, PageHeader, Stat } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { getCreditSummary } from "@/lib/credits";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { requireTutor } from "@/lib/session";

export default async function StudentDetailPage({ params }: { params: { studentId: string } }) {
  const { user, profile } = await requireTutor();
  const enrollment = await db.enrollment.findUnique({
    where: { tutorId_studentId: { tutorId: profile.id, studentId: params.studentId } },
    include: { student: true },
  });
  if (!enrollment) notFound();
  const s = enrollment.student;

  const [credits, lessons, purchases] = await Promise.all([
    getCreditSummary(profile.id, s.id),
    db.lesson.findMany({ where: { tutorId: profile.id, studentId: s.id }, orderBy: { startsAt: "desc" }, include: { student: true } }),
    db.purchase.findMany({ where: { tutorId: profile.id, studentId: s.id, status: { in: ["PAID", "REFUNDED"] } }, orderBy: { createdAt: "desc" } }),
  ]);
  const spent = purchases.filter((p) => p.status === "PAID").reduce((sum, p) => sum + p.amountCents, 0);

  return (
    <>
      <div className="mb-6 flex items-center gap-4">
        <Avatar name={s.name} image={s.image} size={64} />
        <div className="flex-1"><PageHeader title={s.name ?? s.email} description={<a href={`mailto:${s.email}`} className="hover:text-brand-600">{s.email}</a>} /></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5"><CreditBar remaining={credits.remaining} total={credits.total} /></div>
        <Stat label="Odučeno lekcí" value={lessons.filter((l) => l.status === "COMPLETED").length} />
        <Stat label="Celkem zaplaceno" value={formatMoney(spent)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Lekce</h2>
          {lessons.length === 0 ? (
            <p className="card text-sm text-ink-faint">Zatím žádné lekce.</p>
          ) : (
            <div className="space-y-3">{lessons.map((l) => <LessonCard key={l.id} lesson={l} tz={user.timezone} hideStudent />)}</div>
          )}
        </section>
        <aside className="space-y-6">
          <form action={updateStudentNotes} className="card space-y-3">
            <h2 className="font-semibold">Soukromé poznámky</h2>
            <input type="hidden" name="enrollmentId" value={enrollment.id} />
            <textarea name="notes" rows={6} defaultValue={enrollment.notes} className="input" placeholder="Úroveň, cíle, silné a slabé stránky… (student nevidí)" />
            <SubmitButton className="btn-secondary w-full">Uložit</SubmitButton>
          </form>
          <div className="card">
            <h2 className="font-semibold">Nákupy</h2>
            {purchases.length === 0 ? <p className="mt-2 text-sm text-ink-faint">Žádné.</p> : (
              <ul className="mt-3 space-y-2 text-sm">
                {purchases.map((p) => (
                  <li key={p.id} className="flex justify-between gap-2">
                    <span>{p.packageName}<span className="block text-xs text-ink-faint">{formatDate(p.paidAt ?? p.createdAt, user.timezone)}{p.status === "REFUNDED" && " · vráceno"}</span></span>
                    <span className="font-medium">{formatMoney(p.amountCents, p.currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
