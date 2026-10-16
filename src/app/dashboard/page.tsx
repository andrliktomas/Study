import Link from "next/link";
import { becomeTutor } from "@/app/actions/auth";
import { Avatar } from "@/components/Avatar";
import { CreditBar, LessonStatus, Notice, PageHeader, Stat } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { getCreditSummary } from "@/lib/credits";
import { db } from "@/lib/db";
import { formatDateTime, formatMoney } from "@/lib/format";
import { requireUser } from "@/lib/session";

export default async function DashboardHome({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const user = await requireUser();
  const profile = await db.tutorProfile.findUnique({ where: { userId: user.id } });

  return (
    <>
      {searchParams.chyba === "pozvanka" && <Notice tone="error">Pozvánka je neplatná nebo vypršela.</Notice>}
      {profile ? <TutorOverview userId={user.id} tz={user.timezone} name={user.name} /> : null}
      <StudentOverview userId={user.id} tz={user.timezone} isTutor={Boolean(profile)} offerTutor={searchParams["stat-se-lektorem"] === "1"} />
    </>
  );
}

async function TutorOverview({ userId, tz, name }: { userId: string; tz: string; name: string | null }) {
  const profile = await db.tutorProfile.findUniqueOrThrow({
    where: { userId },
    include: { _count: { select: { enrollments: true, packages: true, availability: true } } },
  });
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [upcoming, revenue, pendingNotes] = await Promise.all([
    db.lesson.findMany({
      where: { tutorId: profile.id, status: "SCHEDULED", startsAt: { gte: new Date() } },
      include: { student: true },
      orderBy: { startsAt: "asc" },
      take: 6,
    }),
    db.purchase.aggregate({
      where: { tutorId: profile.id, status: "PAID", paidAt: { gte: monthStart } },
      _sum: { amountCents: true, platformFeeCents: true },
    }),
    db.lesson.count({ where: { tutorId: profile.id, status: "SCHEDULED", endsAt: { lt: new Date() } } }),
  ]);

  const checklist = [
    { done: profile.published, label: "Vyplnit a zveřejnit profil", href: "/dashboard/profil" },
    { done: profile._count.packages > 0, label: "Nastavit balíčky lekcí", href: "/dashboard/balicky" },
    { done: profile._count.availability > 0, label: "Nastavit, kdy učíte", href: "/dashboard/dostupnost" },
    { done: profile.stripeOnboarded, label: "Připojit výplaty (Stripe)", href: "/dashboard/vyplaty" },
    { done: profile.calendarSync, label: "Připojit Google Kalendář", href: "/dashboard/nastaveni" },
    { done: profile._count.enrollments > 0, label: "Pozvat prvního studenta", href: "/dashboard/studenti" },
  ];
  const todo = checklist.filter((c) => !c.done);
  const net = (revenue._sum.amountCents ?? 0) - (revenue._sum.platformFeeCents ?? 0);

  return (
    <section>
      <PageHeader title={`Ahoj${name ? `, ${name.split(" ")[0]}` : ""} 👋`} description="Přehled vaší výuky." />
      {todo.length > 0 && (
        <div className="card mb-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Dokončete nastavení</h2>
            <span className="text-sm text-ink-faint">{checklist.length - todo.length}/{checklist.length}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-50">
            <div className="h-full bg-brand-500 transition-all" style={{ width: `${((checklist.length - todo.length) / checklist.length) * 100}%` }} />
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {checklist.map((c) => (
              <li key={c.label}>
                <Link href={c.href} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition hover:border-brand-300 ${c.done ? "border-slate-100 text-ink-faint line-through" : "border-slate-200"}`}>
                  <span className={`grid h-5 w-5 place-items-center rounded-full text-xs ${c.done ? "bg-brand-500 text-white" : "border border-slate-300"}`}>{c.done && "✓"}</span>
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Studentů" value={profile._count.enrollments} />
        <Stat label="Tržby tento měsíc" value={formatMoney(net)} hint="po odečtení provize platformy" />
        <Stat label="Lekce k doplnění" value={pendingNotes} hint="proběhlé lekce bez uzavření" />
      </div>
      <div className="card mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Nejbližší lekce</h2>
          <Link href="/dashboard/lekce" className="text-sm text-brand-600 hover:underline">Všechny lekce →</Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="mt-4 text-sm text-ink-faint">Žádné naplánované lekce.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {upcoming.map((l) => (
              <li key={l.id} className="flex items-center gap-4 py-3">
                <Avatar name={l.student.name} image={l.student.image} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{l.student.name}</p>
                  <p className="text-sm text-ink-faint">{formatDateTime(l.startsAt, tz)}{l.topic && ` · ${l.topic}`}</p>
                </div>
                {l.meetLink && <a href={l.meetLink} target="_blank" rel="noopener noreferrer" className="btn-secondary px-3 py-1.5 text-xs">Připojit</a>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

async function StudentOverview({ userId, tz, isTutor, offerTutor }: { userId: string; tz: string; isTutor: boolean; offerTutor: boolean }) {
  const enrollments = await db.enrollment.findMany({
    where: { studentId: userId },
    include: { tutor: { include: { user: true } } },
  });
  const upcoming = await db.lesson.findMany({
    where: { studentId: userId, status: "SCHEDULED", startsAt: { gte: new Date() } },
    include: { tutor: { include: { user: true } } },
    orderBy: { startsAt: "asc" },
    take: 5,
  });
  const credits = await Promise.all(enrollments.map((e) => getCreditSummary(e.tutorId, userId)));

  if (isTutor && enrollments.length === 0) return null;

  return (
    <section className={isTutor ? "mt-12" : ""}>
      <PageHeader title={isTutor ? "Moje vlastní výuka" : "Moje výuka"} description="Vaši lektoři, zbývající lekce a nejbližší termíny." />
      {offerTutor && !isTutor && (
        <div className="card mb-6 flex flex-wrap items-center justify-between gap-4 border-brand-200 bg-brand-50/50">
          <div>
            <p className="font-semibold">Chcete na platformě učit?</p>
            <p className="text-sm text-ink-soft">Založte si zdarma profil lektora – svůj účet studenta si ponecháte.</p>
          </div>
          <form action={becomeTutor}><SubmitButton pendingText="Zakládám…">Založit profil lektora</SubmitButton></form>
        </div>
      )}
      {enrollments.length === 0 ? (
        <div className="card text-center">
          <p className="font-medium">Zatím nemáte žádného lektora.</p>
          <p className="mt-1 text-sm text-ink-soft">Přijměte pozvánku od svého lektora, nebo si nějakého najděte v katalogu.</p>
          <Link href="/lektori" className="btn-primary mt-5">Najít lektora</Link>
          {!isTutor && !offerTutor && (
            <form action={becomeTutor} className="mt-6 border-t border-slate-100 pt-6">
              <p className="mb-3 text-sm text-ink-soft">Jste lektor?</p>
              <SubmitButton className="btn-secondary" pendingText="Zakládám…">Založit profil lektora</SubmitButton>
            </form>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {enrollments.map((e, i) => (
            <Link key={e.id} href={`/dashboard/lektor/${e.tutorId}`} className="card-hover">
              <div className="flex items-center gap-3">
                <Avatar name={e.tutor.user.name} image={e.tutor.user.image} size={44} />
                <div>
                  <p className="font-semibold">{e.tutor.user.name}</p>
                  <p className="text-sm text-ink-faint">{e.tutor.headline}</p>
                </div>
              </div>
              <div className="mt-5"><CreditBar remaining={credits[i].remaining} total={credits[i].total} /></div>
            </Link>
          ))}
        </div>
      )}
      {upcoming.length > 0 && (
        <div className="card mt-6">
          <h2 className="font-semibold">Nejbližší lekce</h2>
          <ul className="mt-4 divide-y divide-slate-100">
            {upcoming.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="flex-1">
                  <p className="font-medium">{formatDateTime(l.startsAt, tz)}</p>
                  <p className="text-sm text-ink-faint">{l.tutor.user.name}</p>
                </div>
                <LessonStatus status={l.status} />
                {l.meetLink && <a href={l.meetLink} target="_blank" rel="noopener noreferrer" className="btn-primary px-3 py-1.5 text-xs">Připojit se</a>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
