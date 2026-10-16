import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelLessonByStudent } from "@/app/actions/student";
import { Avatar } from "@/components/Avatar";
import { PackageList } from "@/components/PackageList";
import { CreditBar, LessonStatus, Notice, PageHeader } from "@/components/PageHeader";
import { ReviewForm } from "@/components/ReviewForm";
import { SlotPicker } from "@/components/SlotPicker";
import { SubmitButton } from "@/components/SubmitButton";
import { getCreditSummary } from "@/lib/credits";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { getAvailableSlots } from "@/lib/slots";

export default async function StudentTutorPage({ params, searchParams }: { params: { tutorId: string }; searchParams: Record<string, string | undefined> }) {
  const user = await requireUser();
  const enrollment = await db.enrollment.findUnique({
    where: { tutorId_studentId: { tutorId: params.tutorId, studentId: user.id } },
    include: {
      tutor: {
        include: {
          user: true,
          packages: { where: { active: true }, orderBy: [{ sortOrder: "asc" }, { priceCents: "asc" }] },
        },
      },
    },
  });
  if (!enrollment) notFound();
  const tutor = enrollment.tutor;

  const [credits, lessons] = await Promise.all([
    getCreditSummary(tutor.id, user.id),
    db.lesson.findMany({ where: { tutorId: tutor.id, studentId: user.id }, orderBy: { startsAt: "desc" } }),
  ]);
  const [review, completedCount] = await Promise.all([
    db.review.findUnique({ where: { tutorId_studentId: { tutorId: tutor.id, studentId: user.id } } }),
    db.lesson.count({ where: { tutorId: tutor.id, studentId: user.id, status: "COMPLETED" } }),
  ]);
  const hadTrial = await db.purchase.count({ where: { tutorId: tutor.id, studentId: user.id, status: "PAID", package: { isTrial: true } } });
  const nextPurchase = credits.purchases.find((p) => p.remaining > 0);
  const slots = nextPurchase ? await getAvailableSlots(tutor.id, nextPurchase.durationMin) : [];

  const now = new Date();
  const upcoming = lessons.filter((l) => l.status === "SCHEDULED" && l.startsAt >= now).reverse();
  const history = lessons.filter((l) => !(l.status === "SCHEDULED" && l.startsAt >= now));

  return (
    <>
      {searchParams.zaplaceno && <Notice tone="success">Děkujeme za platbu! Lekce jsou připsané – vyberte si termín. (Pokud se ještě nezobrazují, obnovte za chvíli stránku.)</Notice>}
      {searchParams.zruseno && <Notice tone="warn">Platba byla zrušena.</Notice>}
      {searchParams.vitejte && <Notice tone="success">Pozvánka přijata. Vítejte!</Notice>}
      {searchParams.chyba === "platby" && <Notice tone="error">Lektor zatím nemá aktivní přijímání plateb. Dejte mu prosím vědět.</Notice>}
      {searchParams.chyba === "storno" && <Notice tone="error">Lekci už nelze zrušit – lhůta pro storno ({tutor.cancelHours} h) uplynula. Kontaktujte prosím lektora.</Notice>}
      {searchParams.chyba === "zkusebni" && <Notice tone="error">Zkušební lekci u tohoto lektora už jste využili.</Notice>}

      <PageHeader
        title={tutor.user.name ?? "Lektor"}
        description={tutor.headline}
        actions={tutor.published ? <Link href={`/lektori/${tutor.slug}`} className="btn-ghost">Veřejný profil ↗</Link> : undefined}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="card">
            <h2 className="text-lg font-semibold">Rezervovat lekci</h2>
            <div className="mt-4">
              {nextPurchase ? (
                <SlotPicker tutorId={tutor.id} slots={slots} timezone={user.timezone} durationMin={nextPurchase.durationMin} />
              ) : (
                <p className="text-sm text-ink-soft">Nemáte žádné volné lekce. Kupte si balíček vpravo a pak si vyberte termín.</p>
              )}
            </div>
          </section>

          {upcoming.length > 0 && (
            <section className="card">
              <h2 className="text-lg font-semibold">Naplánované lekce</h2>
              <ul className="mt-4 divide-y divide-slate-100">
                {upcoming.map((l) => {
                  const canCancel = l.startsAt.getTime() - Date.now() > tutor.cancelHours * 3600 * 1000;
                  return (
                    <li key={l.id} className="flex flex-wrap items-center gap-3 py-3">
                      <div className="flex-1">
                        <p className="font-medium">{formatDateTime(l.startsAt, user.timezone)}</p>
                        {l.topic && <p className="text-sm text-ink-faint">{l.topic}</p>}
                      </div>
                      {l.meetLink && <a href={l.meetLink} target="_blank" rel="noopener noreferrer" className="btn-primary px-3 py-1.5 text-xs">Připojit se</a>}
                      {canCancel && (
                        <form action={cancelLessonByStudent}>
                          <input type="hidden" name="lessonId" value={l.id} />
                          <SubmitButton className="btn-danger px-3 py-1.5 text-xs" pendingText="Ruším…">Zrušit</SubmitButton>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-xs text-ink-faint">Lekci lze zrušit nejpozději {tutor.cancelHours} h předem, pak se vrátí do balíčku.</p>
            </section>
          )}

          <section className="card">
            <h2 className="text-lg font-semibold">Historie lekcí a poznámky</h2>
            {history.length === 0 ? (
              <p className="mt-4 text-sm text-ink-faint">Zatím žádné proběhlé lekce.</p>
            ) : (
              <ol className="relative mt-5 space-y-5 border-l-2 border-brand-100 pl-6">
                {history.map((l) => (
                  <li key={l.id} className="relative">
                    <span className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-brand-400" />
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{formatDate(l.startsAt, user.timezone)}</p>
                      <LessonStatus status={l.status} />
                    </div>
                    {l.topic && <p className="mt-1 font-medium text-brand-700">{l.topic}</p>}
                    {l.notes && <p className="mt-1 whitespace-pre-line text-sm text-ink-soft">{l.notes}</p>}
                    {l.homework && (
                      <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900"><strong>Úkol:</strong> {l.homework}</p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card">
            <div className="flex items-center gap-3">
              <Avatar name={tutor.user.name} image={tutor.user.image} size={44} />
              <p className="font-semibold">{tutor.user.name}</p>
            </div>
            <div className="mt-5"><CreditBar remaining={credits.remaining} total={credits.total} /></div>
            {credits.purchases.length > 0 && (
              <ul className="mt-4 space-y-1.5 text-sm">
                {credits.purchases.map((p) => (
                  <li key={p.id} className="flex justify-between text-ink-soft">
                    <span>{p.name}</span>
                    <span>{p.used}/{p.total} vyčerpáno</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {completedCount > 0 && (
            <section className="card">
              <h2 className="text-lg font-semibold">{review ? "Vaše hodnocení" : "Ohodnoťte lektora"}</h2>
              <p className="mb-3 mt-1 text-sm text-ink-soft">Pomůžete dalším studentům s výběrem.</p>
              <ReviewForm tutorId={tutor.id} initial={review ? { rating: review.rating, comment: review.comment } : undefined} />
            </section>
          )}
          <section className="card">
            <h2 className="text-lg font-semibold">Koupit lekce</h2>
            <PackageList
              packages={tutor.packages.filter((p) => !(p.isTrial && hadTrial))}
              tutorId={tutor.id}
              loggedIn
              returnTo={`/dashboard/lektor/${tutor.id}`}
            />
          </section>
        </aside>
      </div>
    </>
  );
}
