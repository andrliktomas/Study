import Link from "next/link";
import { revokeInvitation } from "@/app/actions/tutor";
import { Avatar } from "@/components/Avatar";
import { CopyButton } from "@/components/CopyButton";
import { CreditBar, PageHeader } from "@/components/PageHeader";
import { getCreditSummary } from "@/lib/credits";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { requireTutor } from "@/lib/session";
import { absoluteUrl } from "@/lib/site";
import { InviteForm } from "./InviteForm";

export default async function StudentsPage() {
  const { user, profile } = await requireTutor();
  const [enrollments, invitations] = await Promise.all([
    db.enrollment.findMany({ where: { tutorId: profile.id }, include: { student: true }, orderBy: { createdAt: "desc" } }),
    db.invitation.findMany({ where: { tutorId: profile.id, acceptedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } }),
  ]);
  const credits = await Promise.all(enrollments.map((e) => getCreditSummary(profile.id, e.studentId)));

  return (
    <>
      <PageHeader title="Studenti" description={`${enrollments.length} studentů`} />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div>
          {enrollments.length === 0 ? (
            <div className="card text-center text-sm text-ink-faint">Zatím nemáte žádné studenty. Pošlete jim pozvánku →</div>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {enrollments.map((e, i) => (
                <li key={e.id}>
                  <Link href={`/dashboard/studenti/${e.studentId}`} className="card-hover block">
                    <div className="flex items-center gap-3">
                      <Avatar name={e.student.name} image={e.student.image} size={40} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{e.student.name ?? e.student.email}</p>
                        <p className="truncate text-xs text-ink-faint">{e.student.email}</p>
                      </div>
                    </div>
                    <div className="mt-4"><CreditBar remaining={credits[i].remaining} total={credits[i].total} /></div>
                    {credits[i].total > 0 && credits[i].remaining <= 1 && (
                      <p className="mt-2 text-xs font-medium text-amber-600">Docházejí lekce</p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <aside className="space-y-6">
          <div className="card">
            <h2 className="font-semibold">Pozvat studenta</h2>
            <p className="mt-1 text-sm text-ink-soft">Student dostane e-mail s odkazem. Po přijetí si u vás může kupovat lekce.</p>
            <div className="mt-4"><InviteForm /></div>
          </div>
          {profile.published && (
            <div className="card">
              <h2 className="font-semibold">Odkaz na váš profil</h2>
              <p className="mt-1 text-sm text-ink-soft">Kdo si přes něj koupí lekci, stane se automaticky vaším studentem.</p>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg bg-slate-50 px-2 py-1.5 text-xs">{absoluteUrl(`/lektori/${profile.slug}`)}</code>
                <CopyButton value={absoluteUrl(`/lektori/${profile.slug}`)} />
              </div>
            </div>
          )}
          {invitations.length > 0 && (
            <div className="card">
              <h2 className="font-semibold">Čekající pozvánky</h2>
              <ul className="mt-3 space-y-3">
                {invitations.map((inv) => (
                  <li key={inv.id} className="flex items-center gap-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{inv.email}</p>
                      <p className="text-xs text-ink-faint">platí do {formatDate(inv.expiresAt, user.timezone)}</p>
                    </div>
                    <CopyButton value={absoluteUrl(`/pozvanka/${inv.token}`)} label="Odkaz" />
                    <form action={revokeInvitation}>
                      <input type="hidden" name="id" value={inv.id} />
                      <button className="btn-ghost px-2 text-red-500" aria-label="Zrušit pozvánku">✕</button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
