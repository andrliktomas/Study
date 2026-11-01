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
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { getAvailableSlots } from "@/lib/slots";
import { purchasablePackages } from "@/lib/tutors";

export default async function StudentTutorPage(
  props: { params: Promise<{ tutorId: string }>; searchParams: Promise<Record<string, string | undefined>> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const user = await requireUser();
  const enrollment = await db.enrollment.findUnique({
    where: { tutorId_studentId: { tutorId: params.tutorId, studentId: user.id } },
    include: {
      tutor: {
        include: {
          user: true,
          packages: { where: { active: true }, orderBy: [{ sortOrder: "asc" }, { priceCents: "asc" }] },
          bankAccounts: { select: { currency: true } },
        },
      },
    },
  });
  if (!enrollment) notFound();
  const tutor = enrollment.tutor;
  const archived = Boolean(enrollment.archivedAt) || tutor.suspended;

  const [credits, lessons, review, completedCount, trials, pending, unread] = await Promise.all([
    getCreditSummary(tutor.id, user.id),
    db.lesson.findMany({ where: { tutorId: tutor.id, studentId: user.id }, orderBy: { startsAt: "desc" } }),
    db.review.findUnique({ where: { tutorId_studentId: { tutorId: tutor.id, studentId: user.id } } }),
    db.lesson.count({ where: { tutorId: tutor.id, studentId: user.id, status: "COMPLETED" } }),
    db.purchase.count({
      where: { tutorId: tutor.id, studentId: user.id, package: { isTrial: true }, OR: [{ status: "PAID" }, { status: "PENDING", source: "TRANSFER" }] },
    }),
    db.purchase.findMany({ where: { tutorId: tutor.id, studentId: user.id, status: "PENDING", source: "TRANSFER" }, orderBy: { createdAt: "desc" } }),
    db.message.count({ where: { enrollmentId: enrollment.id, senderId: { not: user.id }, readAt: null } }),
  ]);

  const now = new Date();
  const upcoming = lessons.filter((l) => l.status === "SCHEDULED" && l.startsAt >= now).reverse();
  const history = lessons.filter((l) => !(l.status === "SCHEDULED" && l.startsAt >= now));
  const cancelMs = tutor.cancelHours * 3600 * 1000;

  // režim přesunu lekce: ?presunout=<lessonId>
  const moving = searchParams.presunout ? upcoming.find((l) => l.id === searchParams.presunout && l.startsAt.getTime() - Date.now() > cancelMs) : undefined;
  const nextPurchase = credits.purchases.find((p) => p.remaining > 0);
  const slotDuration = moving ? Math.round((moving.endsAt.getTime() - moving.startsAt.getTime()) / 60000) : nextPurchase?.durationMin;
  const slots = !archived && slotDuration ? await getAvailableSlots(tutor.id, slotDuration, { excludeLessonId: moving?.id }) : [];
  const maxRepeat = nextPurchase ? Math.min(12, credits.purchases.filter((p) => p.durationMin === nextPurchase.durationMin).reduce((s, p) => s + p.remaining, 0)) : 1;

  return (
    <>
      {searchParams.zaplaceno && <Notice tone="success">Děkujeme za platbu! Lekce jsou připsané – vyberte si termín. (Pokud se ještě nezobrazují, obnovte za chvíli stránku.)</Notice>}
      {searchParams.zruseno && <Notice tone="warn">Platba byla zrušena.</Notice>}
      {searchParams.vitejte && <Notice tone="success">Pozvánka přijata. Vítejte!</Notice>}
      {searchParams.presunuto && <Notice tone="success">Lekce je přesunutá. Poslali jsme vám aktualizovanou pozvánku do kalendáře.</Notice>}
      {searchParams.chyba === "prevod" && <Notice tone="error">Lektor zatím nemá bankovní účet v této měně. Napište mu prosím.</Notice>}
      {searchParams.chyba === "storno" && <Notice tone="error">Lekci už nelze zrušit – lhůta pro storno ({tutor.cancelHours} h) uplynula. Kontaktujte prosím lektora.</Notice>}
      {searchParams.chyba === "zkusebni" && <Notice tone="error">Zkušební lekci u tohoto lektora už jste využili.</Notice>}
      {archived && <Notice tone="warn">Výuka u tohoto lektora je pozastavená. Lekce teď nelze kupovat ani rezervovat – napište lektorovi.</Notice>}
      {pending.map((p) => (
        <Notice key={p.id} tone="info">
          Čekáme na vaši platbu převodem za „{p.packageName}“ ({formatMoney(p.amountCents, p.currency)}, VS {p.variableSymbol}).{" "}
          <Link href={`/dashboard/lektor/${tutor.id}/platba/${p.id}`} className="font-semibold underline">Zobrazit QR kód</Link>
        </Notice>
      ))}

      <PageHeader
        title={tutor.user.name ?? "Lektor"}
        description={tutor.headline}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/zpravy/${enrollment.id}`} className="btn-secondary">💬 Zprávy{unread > 0 && <span className="rounded-full bg-brand-500 px-1.5 text-xs text-white">{unread}</span>}</Link>
            {tutor.published && <Link href={`/lektori/${tutor.slug}`} className="btn-ghost">Veřejný profil ↗</Link>}
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {!archived && (
            <section className="card" id="rezervace">
              {moving ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold">Přesunout lekci z {formatDateTime(moving.startsAt, user.timezone)}</h2>
                    <Link href={`/dashboard/lektor/${tutor.id}`} className="btn-ghost text-sm">Zrušit přesun</Link>
                  </div>
                  <div className="mt-4">
                    <SlotPicker mode="reschedule" lessonId={moving.id} tutorId={tutor.id} slots={slots} timezone={user.timezone} durationMin={slotDuration!} />
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold">Rezervovat lekci</h2>
                  <div className="mt-4">
                    {nextPurchase ? (
                      <SlotPicker mode="book" tutorId={tutor.id} slots={slots} timezone={user.timezone} durationMin={nextPurchase.durationMin} maxRepeat={maxRepeat} />
                    ) : (
                      <p className="text-sm text-ink-soft">Nemáte žádné volné lekce. Kupte si balíček vpravo a pak si vyberte termín.</p>
                    )}
                  </div>
                </>
              )}
            </section>
          )}

          {upcoming.length > 0 && (
            <section className="card">
              <h2 className="text-lg font-semibold">Naplánované lekce</h2>
              <ul className="mt-4 divide-y divide-slate-100">
                {upcoming.map((l) => {
                  const canChange = l.startsAt.getTime() - Date.now() > cancelMs;
                  return (
                    <li key={l.id} className="flex flex-wrap items-center gap-2 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {formatDateTime(l.startsAt, user.timezone)}
                          {l.seriesId && <span className="badge ml-2 bg-indigo-50 text-indigo-700">↻ pravidelná</span>}
                        </p>
                        {l.topic && <p className="text-sm text-ink-faint">{l.topic}</p>}
                      </div>
                      {l.meetLink && <a href={l.meetLink} target="_blank" rel="noopener noreferrer" className="btn-primary px-3 py-1.5 text-xs">Připojit se</a>}
                      {canChange && (
                        <>
                          <Link href={`/dashboard/lektor/${tutor.id}?presunout=${l.id}#rezervace`} className="btn-secondary px-3 py-1.5 text-xs">Přesunout</Link>
                          <form action={cancelLessonByStudent}>
                            <input type="hidden" name="lessonId" value={l.id} />
                            <SubmitButton className="btn-danger px-3 py-1.5 text-xs" pendingText="Ruším…">Zrušit</SubmitButton>
                          </form>
                          {l.seriesId && (
                            <form action={cancelLessonByStudent}>
                              <input type="hidden" name="lessonId" value={l.id} />
                              <input type="hidden" name="series" value="1" />
                              <SubmitButton className="btn-ghost px-3 py-1.5 text-xs text-red-600" pendingText="Ruším…">Zrušit i další</SubmitButton>
                            </form>
                          )}
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-xs text-ink-faint">Lekci lze přesunout nebo zrušit nejpozději {tutor.cancelHours} h předem, zrušená se vrátí do balíčku.</p>
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
                  <li key={p.id} className={`flex justify-between gap-2 ${p.expired ? "text-ink-faint line-through" : "text-ink-soft"}`}>
                    <span>
                      {p.name}
                      {p.expiresAt && <span className="block text-xs">{p.expired ? "vypršelo" : "platí do"} {formatDate(p.expiresAt, user.timezone)}</span>}
                    </span>
                    <span className="whitespace-nowrap">{p.used}/{p.total}</span>
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
          {!archived && (
            <section className="card">
              <h2 className="text-lg font-semibold">Koupit lekce</h2>
              <PackageList
                packages={purchasablePackages(tutor.packages, tutor.bankAccounts).filter((p) => !(p.isTrial && trials > 0))}
                returnTo={`/dashboard/lektor/${tutor.id}`}
              />
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
