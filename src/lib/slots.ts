import { addDays, addMinutes } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { db } from "./db";
import { getBusyIntervals } from "./google-calendar";

export type Slot = { start: string; end: string };

const STEP_MIN = 30;
const HORIZON_DAYS = 21;

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

/** Spočítá volné termíny lektora pro lekci dané délky (v UTC). */
export async function getAvailableSlots(tutorId: string, durationMin: number): Promise<Slot[]> {
  const tutor = await db.tutorProfile.findUnique({
    where: { id: tutorId },
    include: { availability: true, user: { select: { id: true, timezone: true } } },
  });
  if (!tutor || tutor.availability.length === 0) return [];

  const tz = tutor.user.timezone;
  const now = new Date();
  const earliest = addMinutes(now, tutor.minNoticeHours * 60);
  const horizon = addDays(now, HORIZON_DAYS);

  const [lessons, busy] = await Promise.all([
    db.lesson.findMany({
      where: { tutorId, status: "SCHEDULED", endsAt: { gt: now }, startsAt: { lt: horizon } },
      select: { startsAt: true, endsAt: true },
    }),
    tutor.calendarSync ? getBusyIntervals(tutor.user.id, now, horizon) : Promise.resolve([]),
  ]);
  const blocked = [
    ...lessons.map((l) => ({ start: l.startsAt, end: l.endsAt })),
    ...busy,
  ];

  const slots: Slot[] = [];
  for (let d = 0; d <= HORIZON_DAYS; d++) {
    const day = addDays(now, d);
    const dateStr = formatInTimeZone(day, tz, "yyyy-MM-dd");
    // den v týdnu v časové zóně lektora
    const weekday = Number(formatInTimeZone(fromZonedTime(`${dateStr}T12:00:00`, tz), tz, "i")) % 7;
    for (const win of tutor.availability.filter((a) => a.weekday === weekday)) {
      for (let m = win.startMinute; m + durationMin <= win.endMinute; m += STEP_MIN) {
        const hh = String(Math.floor(m / 60)).padStart(2, "0");
        const mm = String(m % 60).padStart(2, "0");
        const start = fromZonedTime(`${dateStr}T${hh}:${mm}:00`, tz);
        const end = addMinutes(start, durationMin);
        if (start < earliest || start > horizon) continue;
        if (blocked.some((b) => overlaps(start, end, b.start, b.end))) continue;
        slots.push({ start: start.toISOString(), end: end.toISOString() });
      }
    }
  }
  // deduplikace (překrývající se okna dostupnosti)
  const seen = new Set<string>();
  return slots
    .filter((s) => (seen.has(s.start) ? false : (seen.add(s.start), true)))
    .sort((a, b) => a.start.localeCompare(b.start));
}
