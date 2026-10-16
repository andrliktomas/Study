import { db } from "./db";

export type Rating = { avg: number; count: number };

export async function getRatings(tutorIds: string[]): Promise<Map<string, Rating>> {
  if (tutorIds.length === 0) return new Map();
  const rows = await db.review.groupBy({
    by: ["tutorId"],
    where: { tutorId: { in: tutorIds }, hidden: false },
    _avg: { rating: true },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.tutorId, { avg: r._avg.rating ?? 0, count: r._count._all }]));
}

/** Student smí hodnotit, pokud u lektora absolvoval alespoň jednu lekci. */
export async function canReview(tutorId: string, studentId: string) {
  const done = await db.lesson.count({ where: { tutorId, studentId, status: "COMPLETED" } });
  return done > 0;
}
