// Integrační test proti skutečné databázi (DATABASE_URL by měla mířit na testovací DB).
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { BookingError, bookLessons, moveLesson } from "../../src/lib/booking";
import { db } from "../../src/lib/db";
import { weeklyStarts } from "../../src/lib/slots";

const TAG = `it-${Date.now()}`;
const TZ = "Europe/Prague";
let tutorId = "";

async function makeStudent(name: string, credits: number) {
  const s = await db.user.create({ data: { email: `${TAG}-${name}@example.com`, name, emailVerified: new Date() } });
  await db.enrollment.create({ data: { tutorId, studentId: s.id } });
  if (credits > 0) {
    await db.purchase.create({
      data: { tutorId, studentId: s.id, packageName: "Test", lessonsTotal: credits, durationMin: 60, amountCents: 100, currency: "czk", status: "PAID", source: "DEV", paidAt: new Date() },
    });
  }
  return s.id;
}

/** Zítra (nebo pozítří) v daný čas v pásmu lektora. */
function at(dayOffset: number, hhmm: string) {
  const date = formatInTimeZone(addDays(new Date(), dayOffset), TZ, "yyyy-MM-dd");
  return fromZonedTime(`${date}T${hhmm}:00`, TZ);
}

before(async () => {
  const tutor = await db.user.create({
    data: {
      email: `${TAG}-tutor@example.com`,
      name: "Test Lektor",
      timezone: TZ,
      tutorProfile: {
        create: {
          slug: TAG,
          minNoticeHours: 0,
          availability: { create: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, startMinute: 0, endMinute: 24 * 60 })) },
        },
      },
    },
    include: { tutorProfile: true },
  });
  tutorId = tutor.tutorProfile!.id;
});

after(async () => {
  await db.user.deleteMany({ where: { email: { startsWith: TAG } } });
  await db.$disconnect();
});

const settle = (ps: Promise<unknown>[]) => Promise.allSettled(ps);

test("souběžné rezervace nepřečerpají jediný kredit", async () => {
  const student = await makeStudent("jeden-kredit", 1);
  const starts = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00"].map((t) => at(2, t));
  const results = await settle(starts.map((s) => bookLessons(tutorId, student, [s])));
  const ok = results.filter((r) => r.status === "fulfilled");
  assert.equal(ok.length, 1, "právě jedna rezervace smí projít");
  for (const r of results.filter((r) => r.status === "rejected")) {
    assert.ok((r as PromiseRejectedResult).reason instanceof BookingError);
  }
  assert.equal(await db.lesson.count({ where: { studentId: student, status: "SCHEDULED" } }), 1);
});

test("dva studenti nezaberou stejný termín", async () => {
  const a = await makeStudent("a", 2);
  const b = await makeStudent("b", 2);
  const start = at(3, "15:00");
  const results = await settle([bookLessons(tutorId, a, [start]), bookLessons(tutorId, b, [start])]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(await db.lesson.count({ where: { tutorId, startsAt: start, status: "SCHEDULED" } }), 1);
});

test("pravidelné lekce: rezervuje jen tolik, kolik je kreditů", async () => {
  const student = await makeStudent("serie", 3);
  const res = await bookLessons(tutorId, student, weeklyStarts(at(4, "08:00"), 4, TZ));
  assert.equal(res.created.length, 3);
  assert.equal(res.noCredit.length, 1);
  assert.ok(res.seriesId);
  assert.ok(res.created.every((l) => l.seriesId === res.seriesId));
  // stejný čas v pásmu lektora každý týden (i přes případný přechod času)
  const times = res.created.map((l) => formatInTimeZone(l.startsAt, TZ, "HH:mm"));
  assert.deepEqual(times, ["08:00", "08:00", "08:00"]);
});

test("přesun lekce do obsazeného času selže", async () => {
  const a = await makeStudent("presun-a", 1);
  const b = await makeStudent("presun-b", 1);
  const la = (await bookLessons(tutorId, a, [at(5, "10:00")])).created[0];
  await bookLessons(tutorId, b, [at(5, "12:00")]);
  await assert.rejects(moveLesson(la.id, at(5, "12:30"), "tutor"), BookingError);
  const moved = await moveLesson(la.id, at(5, "16:00"), "student");
  assert.equal(moved.sequence, 1);
});
