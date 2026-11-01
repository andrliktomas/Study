import { addDays, addMinutes, addWeeks } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { db } from "./db";
import { getBusyIntervals } from "./google-calendar";

export type Slot = { start: string; end: string };

const STEP_MIN = 30;
export const HORIZON_DAYS = 21;

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

async function loadTutor(tutorId: string) {
  return db.tutorProfile.findUnique({
    where: { id: tutorId },
    include: { availability: true, user: { select: { id: true, timezone: true } } },
  });
}

async function blockedIntervals(
  tutor: NonNullable<Awaited<ReturnType<typeof loadTutor>>>,
  from: Date,
  to: Date,
  excludeLessonId?: string,
) {
  const [lessons, busy] = await Promise.all([
    db.lesson.findMany({
      where: {
        tutorId: tutor.id,
        status: "SCHEDULED",
        endsAt: { gt: from },
        startsAt: { lt: to },
        ...(excludeLessonId ? { id: { not: excludeLessonId } } : {}),
      },
      select: { startsAt: true, endsAt: true },
    }),
    tutor.calendarSync ? getBusyIntervals(tutor.user.id, from, to) : Promise.resolve([]),
  ]);
  return [...lessons.map((l) => ({ start: l.startsAt, end: l.endsAt })), ...busy];
}

/** Leží termín celý v některém bloku dostupnosti lektora (v jeho časovém pásmu)? */
function withinAvailability(tutor: NonNullable<Awaited<ReturnType<typeof loadTutor>>>, start: Date, durationMin: number) {
  const tz = tutor.user.timezone;
  const weekday = Number(formatInTimeZone(start, tz, "i")) % 7;
  const startMin = Number(formatInTimeZone(start, tz, "H")) * 60 + Number(formatInTimeZone(start, tz, "m"));
  return tutor.availability.some((a) => a.weekday === weekday && startMin >= a.startMinute && startMin + durationMin <= a.endMinute);
}

/** Spočítá volné termíny lektora pro lekci dané délky (v UTC) na příští 3 týdny. */
export async function getAvailableSlots(tutorId: string, durationMin: number, opts: { excludeLessonId?: string } = {}): Promise<Slot[]> {
  const tutor = await loadTutor(tutorId);
  if (!tutor || tutor.availability.length === 0) return [];

  const tz = tutor.user.timezone;
  const now = new Date();
  const earliest = addMinutes(now, tutor.minNoticeHours * 60);
  const horizon = addDays(now, HORIZON_DAYS);
  const blocked = await blockedIntervals(tutor, now, horizon, opts.excludeLessonId);

  const slots: Slot[] = [];
  for (let d = 0; d <= HORIZON_DAYS; d++) {
    const dateStr = formatInTimeZone(addDays(now, d), tz, "yyyy-MM-dd");
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
  const seen = new Set<string>();
  return slots
    .filter((s) => (seen.has(s.start) ? false : (seen.add(s.start), true)))
    .sort((a, b) => a.start.localeCompare(b.start));
}

/**
 * Ověří konkrétní začátky lekcí (i za horizontem 3 týdnů – pro pravidelné lekce).
 * Vrací termíny, které jsou volné, a ty, které kolidují.
 */
export async function checkStarts(
  tutorId: string,
  starts: Date[],
  durationMin: number,
  opts: { excludeLessonId?: string; ignoreAvailability?: boolean } = {},
) {
  const tutor = await loadTutor(tutorId);
  if (!tutor || starts.length === 0) return { ok: [] as Date[], conflicts: starts };
  const earliest = addMinutes(new Date(), opts.ignoreAvailability ? 0 : tutor.minNoticeHours * 60);
  const from = new Date(Math.min(...starts.map((s) => s.getTime())));
  const to = addMinutes(new Date(Math.max(...starts.map((s) => s.getTime()))), durationMin);
  const blocked = await blockedIntervals(tutor, from, to, opts.excludeLessonId);

  const ok: Date[] = [];
  const conflicts: Date[] = [];
  for (const start of starts) {
    const end = addMinutes(start, durationMin);
    const free =
      start >= earliest &&
      (opts.ignoreAvailability || withinAvailability(tutor, start, durationMin)) &&
      !blocked.some((b) => overlaps(start, end, b.start, b.end));
    (free ? ok : conflicts).push(start);
  }
  return { ok, conflicts };
}

/** Stejný čas každý týden – počítá s časovým pásmem lektora (přechod na letní čas). */
export function weeklyStarts(first: Date, count: number, tz: string) {
  const local = toZonedTime(first, tz);
  return Array.from({ length: count }, (_, i) => fromZonedTime(addWeeks(local, i), tz));
}
