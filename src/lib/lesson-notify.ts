import type { Lesson, TutorProfile, User } from "@prisma/client";
import { db } from "./db";
import { formatDateTime } from "./format";
import { createCalendarEvent, updateCalendarEvent } from "./google-calendar";
import { lessonIcsAttachment } from "./ics";
import { sendMail } from "./mail";
import { absoluteUrl, site } from "./site";

type TutorWithUser = TutorProfile & { user: User };

/** Po rezervaci: události v Google Kalendáři lektora (s Meet odkazem) a potvrzovací e-maily. */
export async function afterLessonsBooked(lessons: Lesson[], tutor: TutorWithUser, student: User) {
  const withLinks: Lesson[] = [];
  for (const lesson of lessons) {
    let meetLink = tutor.videoLink;
    let googleEventId: string | null = null;
    if (tutor.calendarSync) {
      const ev = await createCalendarEvent(tutor.userId, {
        summary: `Lekce: ${student.name ?? student.email}`,
        description: `Lekce přes ${site.name}.\nStudent: ${student.name} (${student.email})${tutor.videoLink ? `\nOdkaz na hovor: ${tutor.videoLink}` : ""}\n${absoluteUrl(`/dashboard/studenti/${student.id}`)}`,
        start: lesson.startsAt,
        end: lesson.endsAt,
        attendees: [student.email],
        requestId: lesson.id,
      });
      if (ev) {
        googleEventId = ev.id;
        meetLink = tutor.videoLink || ev.meetLink;
      }
    }
    const updated =
      meetLink || googleEventId
        ? await db.lesson.update({ where: { id: lesson.id }, data: { meetLink, googleEventId } })
        : lesson;
    withLinks.push(updated);
  }

  const first = withLinks[0];
  const tutorName = tutor.user.name ?? "lektor";
  const dates = (tz: string) => withLinks.map((l) => `• ${formatDateTime(l.startsAt, tz)}`).join("\n");
  const many = withLinks.length > 1;

  await sendMail({
    to: student.email,
    subject: many
      ? `Potvrzení pravidelných lekcí: ${withLinks.length}× (lektor: ${tutorName})`
      : `Potvrzení lekce: ${formatDateTime(first.startsAt, student.timezone)} (lektor: ${tutorName})`,
    text: `Dobrý den,\n\n${many ? "vaše pravidelné lekce jsou rezervované" : "vaše lekce je rezervovaná"}:\n${dates(student.timezone)}\n${first.meetLink ? `\nOdkaz na hovor: ${first.meetLink}\n` : ""}\nZrušit nebo přesunout bez ztráty lekce můžete nejpozději ${tutor.cancelHours} h předem:\n${absoluteUrl(`/dashboard/lektor/${tutor.id}`)}\n\nV příloze jsou události do kalendáře. Den předem vám pošleme připomínku.`,
    attachments: withLinks.map((l) => lessonIcsAttachment(l, tutorName)),
  });
  await sendMail({
    to: tutor.user.email,
    subject: many
      ? `Nové pravidelné lekce: ${student.name} (${withLinks.length}×)`
      : `Nová rezervace: ${student.name} – ${formatDateTime(first.startsAt, tutor.user.timezone)}`,
    text: `${student.name} (${student.email}) si rezervoval(a):\n${dates(tutor.user.timezone)}\n\n${absoluteUrl("/dashboard/lekce")}`,
  });
  return withLinks;
}

/** Po přesunu lekce: aktualizace Google události a e-mail druhé straně (+ aktualizovaný .ics studentovi). */
export async function afterLessonMoved(lessonId: string, previousStart: Date, by: "student" | "tutor") {
  const lesson = await db.lesson.findUniqueOrThrow({
    where: { id: lessonId },
    include: { student: true, tutor: { include: { user: true } } },
  });
  if (lesson.googleEventId) await updateCalendarEvent(lesson.tutor.userId, lesson.googleEventId, { start: lesson.startsAt, end: lesson.endsAt });
  const tutorName = lesson.tutor.user.name ?? "lektor";
  const studentTz = lesson.student.timezone;
  const tutorTz = lesson.tutor.user.timezone;

  await sendMail({
    to: lesson.student.email,
    subject: `Lekce přesunuta na ${formatDateTime(lesson.startsAt, studentTz)}`,
    text: `Dobrý den,\n\n${by === "tutor" ? `lektor ${tutorName} přesunul` : "přesunuli jste"} lekci z ${formatDateTime(previousStart, studentTz)} na ${formatDateTime(lesson.startsAt, studentTz)}.\n\n${absoluteUrl(`/dashboard/lektor/${lesson.tutorId}`)}`,
    attachments: [lessonIcsAttachment(lesson, tutorName)],
  });
  if (by === "student") {
    await sendMail({
      to: lesson.tutor.user.email,
      subject: `Přesunutá lekce: ${lesson.student.name} – ${formatDateTime(lesson.startsAt, tutorTz)}`,
      text: `${lesson.student.name} přesunul(a) lekci z ${formatDateTime(previousStart, tutorTz)} na ${formatDateTime(lesson.startsAt, tutorTz)}.\n\n${absoluteUrl("/dashboard/lekce")}`,
    });
  }
}
