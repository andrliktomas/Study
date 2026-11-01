import Link from "next/link";
import { notFound } from "next/navigation";
import { setStudentArchived, updateStudentNotes } from "@/app/actions/tutor";
import { Avatar } from "@/components/Avatar";
import { LessonCard } from "@/components/LessonCard";
import { CreditBar, Notice, PageHeader, Stat } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { getCreditSummary } from "@/lib/credits";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { requireTutor } from "@/lib/session";
import { ManualGrantForm, RefundButton } from "./forms";

export default async function StudentDetailPage({ params, searchParams }: { params: { studentId: string }; searchParams: { chyba?: string; vraceno?: string; mena?: string; karta?: string } }) {
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
    db.purchase.findMany({ where: { tutorId: profile.id, studentId: s.id, status: { in: ["PAID", "REFUNDED", "PENDING"] } }, orderBy: { createdAt: "desc" } }),
  ]);
  const creditById = new Map(credits.purchases.map((c) => [c.id, c]));
  const spent = purchases.filter((p) => p.status !== "PENDING").reduce((sum, p) => sum + p.amountCents - p.refundedCents, 0);

  return (
    <>
      {searchParams.chyba === "kapacita" && (
        <Notice tone="error">Studenta nelze obnovit – máte plnou kapacitu tarifu. <Link href="/dashboard/predplatne" className="underline">Navýšit tarif</Link></Notice>
      )}
      {searchParams.vraceno && (
        <Notice tone="success">
          {searchParams.karta === "1"
            ? `Vráceno ${formatMoney(Number(searchParams.vraceno), searchParams.mena)} na kartu studenta.`
            : `Zaznamenáno vrácení ${formatMoney(Number(searchParams.vraceno), searchParams.mena)} – peníze prosím pošlete studentovi převodem.`}
        </Notice>
      )}
      {enrollment.archivedAt && <Notice tone="warn">Student je v archivu – nepočítá se do tarifu a nemůže kupovat ani rezervovat lekce.</Notice>}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Avatar name={s.name} image={s.image} size={64} />
        <div className="flex-1"><PageHeader title={s.name ?? s.email} description={<a href={`mailto:${s.email}`} className="hover:text-brand-600">{s.email}</a>} /></div>
        <Link href={`/dashboard/zpravy/${enrollment.id}`} className="btn-secondary">💬 Zprávy</Link>
        <form action={setStudentArchived}>
          <input type="hidden" name="studentId" value={s.id} />
          <input type="hidden" name="archive" value={enrollment.archivedAt ? "0" : "1"} />
          <SubmitButton className="btn-ghost" pendingText="…">{enrollment.archivedAt ? "Obnovit z archivu" : "Archivovat"}</SubmitButton>
        </form>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5"><CreditBar remaining={credits.remaining} total={credits.total} /></div>
        <Stat label="Odučeno lekcí" value={lessons.filter((l) => l.status === "COMPLETED").length} />
        <Stat label="Celkem zaplaceno" value={formatMoney(spent)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
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
          <details className="card group">
            <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
              Připsat lekce ručně
              <span className="text-brand-600 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mb-3 mt-2 text-sm text-ink-soft">Když vám student zaplatil hotově, nebo převádíte jeho předplacené hodiny.</p>
            <ManualGrantForm studentId={s.id} />
          </details>
          <div className="card">
            <h2 className="font-semibold">Nákupy</h2>
            {purchases.length === 0 ? <p className="mt-2 text-sm text-ink-faint">Žádné.</p> : (
              <ul className="mt-3 divide-y divide-slate-100 text-sm">
                {purchases.map((p) => {
                  const c = creditById.get(p.id);
                  return (
                    <li key={p.id} className="py-3">
                      <div className="flex justify-between gap-2">
                        <span>
                          {p.packageName}
                          <span className="block text-xs text-ink-faint">
                            {formatDate(p.paidAt ?? p.createdAt, user.timezone)}
                            {p.status === "PENDING" && " · čeká na platbu"}
                            {p.status === "REFUNDED" && " · vráceno"}
                            {p.source === "MANUAL" && " · ručně"}
                            {c && ` · zbývá ${c.remaining}`}
                            {p.expiresAt && ` · platí do ${formatDate(p.expiresAt, user.timezone)}`}
                          </span>
                        </span>
                        <span className="text-right font-medium">
                          {formatMoney(p.amountCents, p.currency)}
                          {p.refundedCents > 0 && <span className="block text-xs font-normal text-red-600">−{formatMoney(p.refundedCents, p.currency)}</span>}
                        </span>
                      </div>
                      {p.status === "PAID" && c && c.total - c.used > 0 && !c.expired && (
                        <RefundButton purchaseId={p.id} lessons={c.total - c.used} />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
