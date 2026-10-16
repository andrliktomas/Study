import { db } from "./db";
import { getRatings } from "./reviews";

export async function getPublishedTutors(opts: { language?: string; q?: string } = {}) {
  const tutors = await db.tutorProfile.findMany({
    where: {
      published: true,
      suspended: false,
      ...(opts.language ? { languages: { contains: opts.language } } : {}),
    },
    include: {
      user: { select: { name: true, image: true } },
      packages: { where: { active: true }, orderBy: { priceCents: "asc" } },
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const ratings = await getRatings(tutors.map((t) => t.id));
  const withRatings = tutors.map((t) => ({ ...t, rating: ratings.get(t.id) ?? { avg: 0, count: 0 } }));
  const q = opts.q?.trim().toLowerCase();
  if (!q) return withRatings;
  return withRatings.filter((t) =>
    [t.user.name, t.headline, t.bio, t.city].some((f) => f?.toLowerCase().includes(q)),
  );
}

export type PublicTutor = Awaited<ReturnType<typeof getPublishedTutors>>[number];

/** Nejnižší cena za jednu lekci (mimo zkušební). */
export function lowestLessonPrice(t: PublicTutor) {
  const regular = t.packages.filter((p) => !p.isTrial);
  if (regular.length === 0) return null;
  const best = regular.reduce((min, p) => (p.priceCents / p.lessonCount < min.priceCents / min.lessonCount ? p : min));
  return { cents: Math.round(best.priceCents / best.lessonCount), currency: best.currency };
}
