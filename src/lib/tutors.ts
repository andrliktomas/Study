import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { effectivePlan } from "./plans";
import { getRatings } from "./reviews";
import { fakePaymentsEnabled } from "./stripe";

/** Lektoři, kteří se smí ukazovat veřejně: zveřejnění, nepozastavení, s balíčkem a s nastavenou platbou. */
export function publicTutorWhere(): Prisma.TutorProfileWhereInput {
  return {
    published: true,
    suspended: false,
    packages: { some: { active: true } },
    ...(fakePaymentsEnabled ? {} : { OR: [{ stripeOnboarded: true }, { bankIban: { not: null } }] }),
  };
}

export async function getPublishedTutors(opts: { language?: string; q?: string } = {}) {
  const tutors = await db.tutorProfile.findMany({
    where: {
      ...publicTutorWhere(),
      ...(opts.language ? { languages: { contains: opts.language } } : {}),
    },
    include: {
      user: { select: { name: true, image: true } },
      packages: { where: { active: true }, orderBy: { priceCents: "asc" } },
      _count: { select: { enrollments: { where: { archivedAt: null } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  const ratings = await getRatings(tutors.map((t) => t.id));
  const enriched = tutors.map((t) => {
    const plan = effectivePlan(t);
    return {
      ...t,
      rating: ratings.get(t.id) ?? { avg: 0, count: 0 },
      full: plan.maxStudents !== null && t._count.enrollments >= plan.maxStudents,
    };
  });
  const q = opts.q?.trim().toLowerCase();
  if (!q) return enriched;
  return enriched.filter((t) => [t.user.name, t.headline, t.bio, t.city].some((f) => f?.toLowerCase().includes(q)));
}

export type PublicTutor = Awaited<ReturnType<typeof getPublishedTutors>>[number];

/** Nejnižší cena za jednu lekci (mimo zkušební). */
export function lowestLessonPrice(t: PublicTutor) {
  const regular = t.packages.filter((p) => !p.isTrial);
  if (regular.length === 0) return null;
  const best = regular.reduce((min, p) => (p.priceCents / p.lessonCount < min.priceCents / min.lessonCount ? p : min));
  return { cents: Math.round(best.priceCents / best.lessonCount), currency: best.currency };
}
