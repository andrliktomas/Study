import { db } from "./db";

/** Stavy lekce, které spotřebují kredit z balíčku. */
export const CONSUMING_STATUSES = ["SCHEDULED", "COMPLETED", "NO_SHOW"];

type PurchaseLike = { lessonsTotal: number; refundedLessons: number; expiresAt: Date | null };

export function purchaseRemaining(p: PurchaseLike, used: number, now = new Date()) {
  if (p.expiresAt && p.expiresAt < now) return 0;
  return Math.max(0, p.lessonsTotal - p.refundedLessons - used);
}

export async function getCreditSummary(tutorId: string, studentId: string) {
  const purchases = await db.purchase.findMany({
    where: { tutorId, studentId, status: "PAID" },
    orderBy: [{ expiresAt: { sort: "asc", nulls: "last" } }, { paidAt: "asc" }],
    include: { _count: { select: { lessons: { where: { status: { in: CONSUMING_STATUSES } } } } } },
  });
  const now = new Date();
  const items = purchases.map((p) => {
    const used = p._count.lessons;
    const total = p.lessonsTotal - p.refundedLessons;
    return {
      id: p.id,
      name: p.packageName,
      durationMin: p.durationMin,
      total,
      used,
      remaining: purchaseRemaining(p, used, now),
      expiresAt: p.expiresAt,
      expired: Boolean(p.expiresAt && p.expiresAt < now),
      unusedExpired: p.expiresAt && p.expiresAt < now ? Math.max(0, total - used) : 0,
      paidAt: p.paidAt,
    };
  });
  const active = items.filter((p) => !p.expired);
  return {
    purchases: items,
    total: active.reduce((s, p) => s + p.total, 0),
    used: active.reduce((s, p) => s + p.used, 0),
    remaining: items.reduce((s, p) => s + p.remaining, 0),
  };
}
