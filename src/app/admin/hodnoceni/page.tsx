import { setReviewHidden } from "@/app/actions/admin";
import { PageHeader } from "@/components/PageHeader";
import { Stars } from "@/components/Stars";
import { SubmitButton } from "@/components/SubmitButton";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

export default async function AdminReviews() {
  const reviews = await db.review.findMany({
    include: { student: { select: { name: true, email: true } }, tutor: { include: { user: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <>
      <PageHeader title="Hodnocení" description="Skryté hodnocení se nezobrazuje na profilu ani nezapočítává do průměru." />
      <div className="space-y-3">
        {reviews.length === 0 && <p className="card text-sm text-ink-faint">Zatím žádná hodnocení.</p>}
        {reviews.map((r) => (
          <div key={r.id} className={`card flex flex-wrap items-start gap-4 p-5 ${r.hidden ? "opacity-60" : ""}`}>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Stars value={r.rating} />
                <strong>{r.student.name ?? r.student.email}</strong>
                <span className="text-ink-faint">→ {r.tutor.user.name} · {formatDate(r.createdAt)}</span>
                {r.hidden && <span className="badge bg-red-100 text-red-700">Skryto</span>}
              </div>
              {r.comment && <p className="mt-2 text-sm text-ink-soft">{r.comment}</p>}
            </div>
            <form action={setReviewHidden}>
              <input type="hidden" name="reviewId" value={r.id} />
              <input type="hidden" name="hidden" value={r.hidden ? "0" : "1"} />
              <SubmitButton className={r.hidden ? "btn-secondary px-3 py-1.5 text-xs" : "btn-danger px-3 py-1.5 text-xs"} pendingText="…">{r.hidden ? "Zobrazit" : "Skrýt"}</SubmitButton>
            </form>
          </div>
        ))}
      </div>
    </>
  );
}
