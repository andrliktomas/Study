import Link from "next/link";
import { LessonCard } from "@/components/LessonCard";
import { PageHeader } from "@/components/PageHeader";
import { db } from "@/lib/db";
import { requireTutor } from "@/lib/session";

const TABS = [
  { key: "nadchazejici", label: "Nadcházející" },
  { key: "k-doplneni", label: "K doplnění" },
  { key: "historie", label: "Historie" },
];

export default async function LessonsPage({ searchParams }: { searchParams: { tab?: string } }) {
  const { user, profile } = await requireTutor();
  const tab = TABS.some((t) => t.key === searchParams.tab) ? searchParams.tab! : "nadchazejici";
  const now = new Date();
  const where =
    tab === "nadchazejici"
      ? { status: "SCHEDULED", endsAt: { gte: now } }
      : tab === "k-doplneni"
        ? { status: "SCHEDULED", endsAt: { lt: now } }
        : { status: { not: "SCHEDULED" } };
  const lessons = await db.lesson.findMany({
    where: { tutorId: profile.id, ...where },
    include: { student: true },
    orderBy: { startsAt: tab === "nadchazejici" ? "asc" : "desc" },
    take: 100,
  });

  return (
    <>
      <PageHeader title="Lekce" description="Po lekci zapište, co jste probírali, a označte ji jako proběhlou." />
      <div className="mb-5 inline-flex rounded-xl bg-brand-50 p-1 text-sm font-medium">
        {TABS.map((t) => (
          <Link key={t.key} href={`/dashboard/lekce?tab=${t.key}`} className={`rounded-lg px-4 py-2 transition ${tab === t.key ? "bg-white text-brand-700 shadow-soft" : "text-ink-soft hover:text-brand-700"}`}>
            {t.label}
          </Link>
        ))}
      </div>
      {lessons.length === 0 ? (
        <p className="card text-sm text-ink-faint">Nic tu není.</p>
      ) : (
        <div className="space-y-3">{lessons.map((l) => <LessonCard key={l.id} lesson={l} tz={user.timezone} />)}</div>
      )}
    </>
  );
}
