import { db } from "./db";

/** Stavy lekce, které spotřebují kredit z balíčku. */
export const CONSUMING_STATUSES = ["SCHEDULED", "COMPLETED", "NO_SHOW"];

export async function getCreditSummary(tutorId: string, studentId: string) {
  const purchases = await db.purchase.findMany({
    where: { tutorId, studentId, status: "PAID" },
    orderBy: { paidAt: "asc" },
    include: { _count: { select: { lessons: { where: { status: { in: CONSUMING_STATUSES } } } } } },
  });
  const items = purchases.map((p) => ({
    id: p.id,
    name: p.packageName,
    durationMin: p.durationMin,
    total: p.lessonsTotal,
    used: p._count.lessons,
    remaining: Math.max(0, p.lessonsTotal - p._count.lessons),
    paidAt: p.paidAt,
  }));
  return {
    purchases: items,
    total: items.reduce((s, p) => s + p.total, 0),
    used: items.reduce((s, p) => s + p.used, 0),
    remaining: items.reduce((s, p) => s + p.remaining, 0),
  };
}
