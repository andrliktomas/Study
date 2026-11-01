import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { PageHeader } from "@/components/PageHeader";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { participantWhere } from "@/lib/messages";
import { requireUser } from "@/lib/session";

export default async function MessagesPage() {
  const user = await requireUser();
  const enrollments = await db.enrollment.findMany({
    where: participantWhere(user.id),
    include: {
      student: true,
      tutor: { include: { user: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, include: { file: { select: { filename: true } } } },
      _count: { select: { messages: { where: { readAt: null, senderId: { not: user.id } } } } },
    },
  });
  const threads = enrollments
    .map((e) => {
      const isTutor = e.tutor.userId === user.id;
      return { e, isTutor, other: isTutor ? e.student : e.tutor.user, last: e.messages[0], unread: e._count.messages };
    })
    .sort((a, b) => (b.last?.createdAt.getTime() ?? 0) - (a.last?.createdAt.getTime() ?? 0));

  return (
    <>
      <PageHeader title="Zprávy" description="Komunikace a sdílené materiály s vašimi studenty a lektory." />
      {threads.length === 0 ? (
        <p className="card text-sm text-ink-faint">Zatím nemáte s kým psát – zprávy jsou dostupné mezi lektorem a jeho studenty.</p>
      ) : (
        <ul className="card divide-y divide-slate-100 p-0">
          {threads.map(({ e, isTutor, other, last, unread }) => (
            <li key={e.id}>
              <Link href={`/dashboard/zpravy/${e.id}`} className="flex items-center gap-4 px-5 py-4 transition hover:bg-brand-50/50">
                <Avatar name={other.name} image={other.image} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`truncate ${unread ? "font-bold" : "font-medium"}`}>{other.name ?? other.email}</p>
                    <span className="text-xs text-ink-faint">{isTutor ? "student" : "lektor"}</span>
                    {e.archivedAt && <span className="badge bg-slate-100 text-ink-faint">archiv</span>}
                  </div>
                  <p className={`truncate text-sm ${unread ? "text-ink" : "text-ink-faint"}`}>
                    {last ? `${last.senderId === user.id ? "Vy: " : ""}${last.body || `📎 ${last.file?.filename ?? "příloha"}`}` : "Zatím žádné zprávy – napište první."}
                  </p>
                </div>
                <div className="text-right">
                  {last && <p className="text-xs text-ink-faint">{formatDateTime(last.createdAt, user.timezone)}</p>}
                  {unread > 0 && <span className="mt-1 inline-block rounded-full bg-brand-500 px-2 text-xs font-bold text-white">{unread}</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
