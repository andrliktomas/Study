import { addHours } from "date-fns";
import { db } from "./db";
import { formatDateTime } from "./format";
import { sendMail } from "./mail";
import { cleanupRateLimits } from "./rate-limit";
import { absoluteUrl, site } from "./site";

/** Pošle připomínku lekcím, které začínají během příštích 24 hodin a ještě připomínku nedostaly. */
export async function sendDueReminders() {
  const now = new Date();
  const lessons = await db.lesson.findMany({
    where: { status: "SCHEDULED", reminderSentAt: null, startsAt: { gt: now, lte: addHours(now, 24) } },
    include: { student: true, tutor: { include: { user: true } } },
    take: 200,
  });

  let sent = 0;
  for (const l of lessons) {
    // Nejdřív označíme, aby souběžné spuštění cronu neposlalo připomínku dvakrát.
    const claimed = await db.lesson.updateMany({ where: { id: l.id, reminderSentAt: null }, data: { reminderSentAt: now } });
    if (claimed.count === 0) continue;

    const tutorName = l.tutor.user.name ?? "lektor";
    const studentName = l.student.name ?? l.student.email;
    const link = l.meetLink ? `\nOdkaz na hovor: ${l.meetLink}` : "";
    try {
      await sendMail({
        to: l.student.email,
        subject: `Připomínka lekce: ${formatDateTime(l.startsAt, l.student.timezone)} (lektor: ${tutorName})`,
        text: `Dobrý den,\n\npřipomínáme vaši lekci ${formatDateTime(l.startsAt, l.student.timezone)} (lektor: ${tutorName}).${link}\n\nPotřebujete lekci zrušit? Bez ztráty lekce to jde nejpozději ${l.tutor.cancelHours} h předem:\n${absoluteUrl(`/dashboard/lektor/${l.tutorId}`)}\n\n${site.name}`,
      });
      await sendMail({
        to: l.tutor.user.email,
        subject: `Připomínka: ${studentName} – ${formatDateTime(l.startsAt, l.tutor.user.timezone)}`,
        text: `Blíží se vaše lekce ${formatDateTime(l.startsAt, l.tutor.user.timezone)} (student: ${studentName}).${link}\n\nKarta studenta: ${absoluteUrl(`/dashboard/studenti/${l.studentId}`)}`,
      });
      sent++;
    } catch (e) {
      console.error("[reminders] odeslání selhalo", l.id, e);
      await db.lesson.update({ where: { id: l.id }, data: { reminderSentAt: null } });
    }
  }
  await cleanupRateLimits();
  return { checked: lessons.length, sent };
}
