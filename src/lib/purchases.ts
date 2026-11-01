import { addDays } from "date-fns";
import { db } from "./db";
import { formatDateTime, formatMoney } from "./format";
import { deleteCalendarEvent } from "./google-calendar";
import { lessonIcsAttachment } from "./ics";
import { sendMail } from "./mail";
import { absoluteUrl } from "./site";

/** Označí nákup jako zaplacený (karta, potvrzený převod, simulace) a nastaví platnost balíčku. */
export async function markPurchasePaid(purchaseId: string, extra: { notifyTutor?: boolean } = {}) {
  const purchase = await db.purchase.findUnique({ where: { id: purchaseId }, include: { package: true } });
  if (!purchase || purchase.status !== "PENDING") return null;
  const paidAt = new Date();
  const validity = purchase.package?.validityDays;
  const res = await db.purchase.updateMany({
    where: { id: purchaseId, status: "PENDING" },
    data: {
      status: "PAID",
      paidAt,
      expiresAt: validity ? addDays(paidAt, validity) : null,
    },
  });
  if (res.count === 0) return null;

  const p = await db.purchase.findUniqueOrThrow({
    where: { id: purchaseId },
    include: { student: true, tutor: { include: { user: true } } },
  });
  if (extra.notifyTutor !== false) {
    await sendMail({
      to: p.tutor.user.email,
      subject: `Nová platba: ${p.student.name} – ${p.packageName}`,
      text: `${p.student.name} zaplatil(a) ${p.packageName} (${formatMoney(p.amountCents, p.currency)}).\n${absoluteUrl(`/dashboard/studenti/${p.studentId}`)}`,
    });
  }
  await sendMail({
    to: p.student.email,
    subject: `Platba přijata: ${p.packageName}`,
    text: `Dobrý den,\n\nplatba za „${p.packageName}“ u lektora ${p.tutor.user.name} je připsaná. Teď si můžete vybrat termín lekce:\n${absoluteUrl(`/dashboard/lektor/${p.tutorId}`)}`,
  });
  return p;
}

/** Zruší budoucí naplánované lekce (např. při vrácení peněz) a smaže je z Google Kalendáře lektora. */
export async function cancelFutureLessons(where: { purchaseId?: string; seriesId?: string; ids?: string[] }, notify: { reason: string } | null) {
  const lessons = await db.lesson.findMany({
    where: {
      status: "SCHEDULED",
      startsAt: { gt: new Date() },
      ...(where.purchaseId ? { purchaseId: where.purchaseId } : {}),
      ...(where.seriesId ? { seriesId: where.seriesId } : {}),
      ...(where.ids ? { id: { in: where.ids } } : {}),
    },
    include: { student: true, tutor: { include: { user: true } } },
    orderBy: { startsAt: "asc" },
  });
  if (lessons.length === 0) return [];
  await db.lesson.updateMany({ where: { id: { in: lessons.map((l) => l.id) } }, data: { status: "CANCELLED" } });
  for (const l of lessons) {
    if (l.googleEventId) await deleteCalendarEvent(l.tutor.userId, l.googleEventId);
  }
  if (notify) {
    // každý student dostane jeden e-mail se svými zrušenými lekcemi
    for (const studentId of [...new Set(lessons.map((l) => l.studentId))]) {
      const mine = lessons.filter((l) => l.studentId === studentId);
      const first = mine[0];
      if (first.student.deletedAt) continue;
      const list = mine.map((l) => `• ${formatDateTime(l.startsAt, first.student.timezone)}`).join("\n");
      await sendMail({
        to: first.student.email,
        subject: mine.length === 1 ? `Zrušená lekce ${formatDateTime(first.startsAt, first.student.timezone)}` : `Zrušené lekce (${mine.length})`,
        text: `Dobrý den,\n\n${notify.reason}\n\nZrušené lekce:\n${list}\n\n${absoluteUrl(`/dashboard/lektor/${first.tutorId}`)}`,
        attachments: mine.map((l) => lessonIcsAttachment({ ...l, sequence: l.sequence + 1 }, l.tutor.user.name ?? "lektor", true)),
      });
    }
  }
  return lessons;
}

/** Nový variabilní symbol pro platbu převodem (10 číslic, unikátní). */
export async function newVariableSymbol() {
  for (let i = 0; i < 10; i++) {
    const vs = String(Math.floor(1_000_000_000 + Math.random() * 8_999_999_999));
    const exists = await db.purchase.findUnique({ where: { variableSymbol: vs } });
    if (!exists) return vs;
  }
  throw new Error("Nepodařilo se vygenerovat variabilní symbol");
}
