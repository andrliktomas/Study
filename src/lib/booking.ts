import { Prisma, type Lesson } from "@prisma/client";
import { addHours, addMinutes } from "date-fns";
import { createId } from "./id";
import { CONSUMING_STATUSES, getCreditSummary, purchaseRemaining } from "./credits";
import { db } from "./db";
import { checkStarts } from "./slots";

export class BookingError extends Error {}

/** Spustí transakci v izolaci SERIALIZABLE; při kolizi souběžných transakcí ji zopakuje. */
export async function serializable<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>, retries = 4): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 });
    } catch (e) {
      const conflict = e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2034" || e.code === "P2028");
      if (!conflict || attempt >= retries) throw e;
      await new Promise((r) => setTimeout(r, 30 + Math.random() * 120));
    }
  }
}

/**
 * Rezervuje jednu nebo více lekcí (pravidelné lekce = více začátků).
 * Kredity i kolize se ověřují uvnitř serializovatelné transakce, takže souběžné kliknutí
 * nikdy nepřečerpá balíček ani nezabere stejný termín dvakrát.
 */
export async function bookLessons(tutorId: string, studentId: string, starts: Date[]) {
  const enrollment = await db.enrollment.findUnique({ where: { tutorId_studentId: { tutorId, studentId } } });
  if (!enrollment) throw new BookingError("U tohoto lektora nejste zapsáni.");
  if (enrollment.archivedAt) throw new BookingError("Lektor vás přesunul do archivu. Pro obnovení výuky ho kontaktujte.");

  const credits = await getCreditSummary(tutorId, studentId);
  const first = credits.purchases.find((p) => p.remaining > 0);
  if (!first) throw new BookingError("Nemáte žádné volné lekce. Nejdřív si kupte balíček.");
  const durationMin = first.durationMin;

  const sorted = [...starts].sort((a, b) => a.getTime() - b.getTime());
  const { ok, conflicts } = await checkStarts(tutorId, sorted, durationMin);
  if (ok.length === 0) throw new BookingError(sorted.length > 1 ? "Žádný z vybraných termínů není volný." : "Tento termín už není volný. Vyberte prosím jiný.");

  const seriesId = ok.length > 1 ? createId() : null;
  const now = new Date();

  const result = await serializable(async (tx) => {
    const purchases = await tx.purchase.findMany({
      where: { tutorId, studentId, status: "PAID", durationMin },
      orderBy: [{ expiresAt: { sort: "asc", nulls: "last" } }, { paidAt: "asc" }],
      include: { _count: { select: { lessons: { where: { status: { in: CONSUMING_STATUSES } } } } } },
    });
    const left = new Map(purchases.map((p) => [p.id, purchaseRemaining(p, p._count.lessons, now)]));

    const created: Lesson[] = [];
    const noCredit: Date[] = [];
    const clashed: Date[] = [];
    for (const start of ok) {
      const end = addMinutes(start, durationMin);
      const purchase = purchases.find((p) => (left.get(p.id) ?? 0) > 0 && (!p.expiresAt || start <= p.expiresAt));
      if (!purchase) {
        noCredit.push(start);
        continue;
      }
      const clash = await tx.lesson.count({ where: { tutorId, status: "SCHEDULED", startsAt: { lt: end }, endsAt: { gt: start } } });
      if (clash > 0) {
        clashed.push(start);
        continue;
      }
      left.set(purchase.id, (left.get(purchase.id) ?? 0) - 1);
      created.push(
        await tx.lesson.create({
          data: {
            tutorId,
            studentId,
            purchaseId: purchase.id,
            seriesId,
            startsAt: start,
            endsAt: end,
            // potvrzení rezervace poslouží jako připomínka, když lekce začíná do 24 hodin
            reminderSentAt: start < addHours(now, 24) ? now : null,
          },
        }),
      );
    }
    return { created, noCredit, clashed };
  });

  if (result.created.length === 0) {
    throw new BookingError(result.noCredit.length ? "Na vybrané termíny vám nezbývají lekce (nebo balíček do té doby vyprší)." : "Tento termín si mezitím rezervoval někdo jiný.");
  }
  return { ...result, conflicts, durationMin, seriesId };
}

/** Přesune lekci. Student smí jen do volných termínů dostupnosti, lektor kamkoli bez kolize. */
export async function moveLesson(lessonId: string, newStart: Date, by: "student" | "tutor") {
  const lesson = await db.lesson.findUnique({ where: { id: lessonId }, include: { purchase: true } });
  if (!lesson || lesson.status !== "SCHEDULED") throw new BookingError("Lekci nelze přesunout.");
  const durationMin = Math.round((lesson.endsAt.getTime() - lesson.startsAt.getTime()) / 60000);
  const newEnd = addMinutes(newStart, durationMin);

  if (by === "student") {
    const { ok } = await checkStarts(lesson.tutorId, [newStart], durationMin, { excludeLessonId: lesson.id });
    if (ok.length === 0) throw new BookingError("Tento termín není volný.");
    if (lesson.purchase.expiresAt && newStart > lesson.purchase.expiresAt) throw new BookingError("Balíček do té doby vyprší.");
  } else if (newStart < new Date()) {
    throw new BookingError("Nový termín musí být v budoucnosti.");
  }

  return serializable(async (tx) => {
    const clash = await tx.lesson.count({
      where: { tutorId: lesson.tutorId, status: "SCHEDULED", id: { not: lesson.id }, startsAt: { lt: newEnd }, endsAt: { gt: newStart } },
    });
    if (clash > 0) throw new BookingError("V tomto čase už je jiná lekce.");
    return tx.lesson.update({
      where: { id: lesson.id },
      data: {
        startsAt: newStart,
        endsAt: newEnd,
        sequence: { increment: 1 },
        reminderSentAt: newStart < addHours(new Date(), 24) ? new Date() : null,
      },
    });
  });
}
