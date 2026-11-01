import { site } from "./site";

function icsDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/**
 * Událost iCalendar – student si ji přidá do libovolného kalendáře (Google, Apple, Outlook).
 * Stejné UID + vyšší SEQUENCE = aktualizace existující události (přesun, zrušení).
 */
export function lessonIcs(opts: {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description: string;
  url?: string | null;
  sequence?: number;
  cancelled?: boolean;
}) {
  const host = new URL(site.url).hostname;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${site.name}//CS`,
    `METHOD:${opts.cancelled ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${opts.uid}@${host}`,
    `SEQUENCE:${opts.sequence ?? 0}`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(opts.start)}`,
    `DTEND:${icsDate(opts.end)}`,
    `SUMMARY:${esc(opts.summary)}`,
    `DESCRIPTION:${esc(opts.description)}`,
    ...(opts.url ? [`URL:${opts.url}`, `LOCATION:${esc(opts.url)}`] : []),
    `STATUS:${opts.cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Lekce za 30 minut",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function lessonIcsAttachment(
  l: { id: string; startsAt: Date; endsAt: Date; meetLink: string | null; sequence: number },
  tutorName: string,
  cancelled = false,
) {
  return {
    filename: "lekce.ics",
    contentType: `text/calendar; charset=utf-8; method=${cancelled ? "CANCEL" : "PUBLISH"}`,
    content: lessonIcs({
      uid: l.id,
      start: l.startsAt,
      end: l.endsAt,
      summary: `Lekce – ${tutorName}`,
      description: `${site.name}${l.meetLink ? `\nOdkaz na hovor: ${l.meetLink}` : ""}`,
      url: l.meetLink,
      sequence: l.sequence,
      cancelled,
    }),
  };
}
