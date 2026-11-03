import { formatInTimeZone } from "date-fns-tz";
import { CONSUMING_STATUSES, purchaseRemaining } from "./credits";
import { csvAmount, toCsv } from "./csv";
import { db } from "./db";

/**
 * Export dat lektora do tabulky (CSV pro Excel / Google Tabulky): studenti, lekce, platby.
 * Sloupce studentů začínají stejně jako importní šablona (Jméno; E-mail; Zbývající lekce; Délka lekce; Poznámka),
 * takže export jde nahrát zpátky.
 */
export const EXPORTS = {
  studenti: "Studenti",
  lekce: "Lekce",
  platby: "Platby",
} as const;
export type ExportKind = keyof typeof EXPORTS;

const LESSON_STATUS: Record<string, string> = {
  SCHEDULED: "naplánovaná",
  COMPLETED: "proběhla",
  NO_SHOW: "student nepřišel",
  CANCELLED: "zrušená",
};
const PURCHASE_STATUS: Record<string, string> = {
  PENDING: "čeká na platbu",
  PAID: "zaplaceno",
  REFUNDED: "vráceno",
  CANCELLED: "zrušeno",
};
const PURCHASE_SOURCE: Record<string, string> = {
  TRANSFER: "převod",
  MANUAL: "ručně připsáno",
};

export async function tutorExportCsv(tutorId: string, kind: ExportKind, tz: string, now = new Date()) {
  const date = (d: Date | null | undefined) => (d ? formatInTimeZone(d, tz, "yyyy-MM-dd") : "");
  const time = (d: Date) => formatInTimeZone(d, tz, "HH:mm");

  if (kind === "studenti") {
    const enrollments = await db.enrollment.findMany({
      where: { tutorId },
      include: { student: { select: { name: true, email: true, deletedAt: true } } },
      orderBy: { createdAt: "asc" },
    });
    const purchases = await db.purchase.findMany({
      where: { tutorId, status: "PAID" },
      orderBy: [{ expiresAt: { sort: "asc", nulls: "last" } }, { paidAt: "asc" }],
      include: { _count: { select: { lessons: { where: { status: { in: CONSUMING_STATUSES } } } } } },
    });
    const done = await db.lesson.groupBy({ by: ["studentId"], where: { tutorId, status: "COMPLETED" }, _count: { _all: true } });
    const doneBy = new Map(done.map((d) => [d.studentId, d._count._all]));
    const lastLesson = await db.lesson.groupBy({ by: ["studentId"], where: { tutorId, status: "COMPLETED" }, _max: { startsAt: true } });
    const lastBy = new Map(lastLesson.map((d) => [d.studentId, d._max.startsAt]));

    const rows: unknown[][] = [["Jméno", "E-mail", "Zbývající lekce", "Délka lekce (min)", "Poznámka", "Stav", "Zapsán(a) od", "Proběhlých lekcí", "Poslední lekce"]];
    for (const e of enrollments) {
      const mine = purchases.filter((p) => p.studentId === e.studentId);
      const left = mine.map((p) => ({ p, remaining: purchaseRemaining(p, p._count.lessons, now) }));
      const remaining = left.reduce((s, x) => s + x.remaining, 0);
      const duration = left.find((x) => x.remaining > 0)?.p.durationMin ?? mine.at(-1)?.durationMin ?? "";
      const deleted = Boolean(e.student.deletedAt);
      rows.push([
        e.student.name ?? "",
        deleted ? "" : e.student.email,
        remaining,
        duration,
        e.notes,
        deleted ? "účet smazán" : e.archivedAt ? "archiv" : "aktivní",
        date(e.createdAt),
        doneBy.get(e.studentId) ?? 0,
        date(lastBy.get(e.studentId)),
      ]);
    }
    return toCsv(rows);
  }

  if (kind === "lekce") {
    const lessons = await db.lesson.findMany({
      where: { tutorId },
      include: { student: { select: { name: true, email: true, deletedAt: true } }, purchase: { select: { packageName: true } } },
      orderBy: { startsAt: "asc" },
    });
    const rows: unknown[][] = [["Datum", "Začátek", "Konec", "Student", "E-mail", "Stav", "Téma", "Poznámky z lekce", "Úkol", "Balíček"]];
    for (const l of lessons) {
      rows.push([
        date(l.startsAt), time(l.startsAt), time(l.endsAt),
        l.student.name ?? "", l.student.deletedAt ? "" : l.student.email,
        LESSON_STATUS[l.status] ?? l.status, l.topic, l.notes, l.homework, l.purchase.packageName,
      ]);
    }
    return toCsv(rows);
  }

  const purchases = await db.purchase.findMany({
    where: { tutorId, source: { in: ["TRANSFER", "MANUAL"] } },
    include: { student: { select: { name: true, email: true, deletedAt: true } } },
    orderBy: { createdAt: "asc" },
  });
  const rows: unknown[][] = [["Objednáno", "Zaplaceno", "Student", "E-mail", "Balíček", "Lekcí", "Částka", "Měna", "Stav", "Způsob", "Variabilní symbol", "Vráceno", "Platnost do", "Poznámka"]];
  for (const p of purchases) {
    rows.push([
      date(p.createdAt), date(p.paidAt), p.student.name ?? "", p.student.deletedAt ? "" : p.student.email,
      p.packageName, p.lessonsTotal, csvAmount(p.amountCents), p.currency.toUpperCase(),
      PURCHASE_STATUS[p.status] ?? p.status, PURCHASE_SOURCE[p.source] ?? p.source, p.variableSymbol ?? "",
      p.refundedCents ? csvAmount(p.refundedCents) : "", date(p.expiresAt), p.note ?? "",
    ]);
  }
  return toCsv(rows);
}
