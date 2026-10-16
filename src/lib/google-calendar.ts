import { db } from "./db";

const CAL_API = "https://www.googleapis.com/calendar/v3";

export function hasCalendarScope(scope: string | null | undefined) {
  return Boolean(scope?.includes("auth/calendar.events"));
}

/** Vrátí platný access token pro Google Kalendář uživatele, nebo null když kalendář nemá připojený. */
export async function getCalendarToken(userId: string): Promise<string | null> {
  const account = await db.account.findFirst({ where: { userId, provider: "google" } });
  if (!account || !hasCalendarScope(account.scope)) return null;

  const now = Math.floor(Date.now() / 1000);
  if (account.access_token && account.expires_at && account.expires_at - 60 > now) {
    return account.access_token;
  }
  if (!account.refresh_token) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
    }),
  });
  if (!res.ok) {
    console.error("[google] obnovení tokenu selhalo", res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as { access_token: string; expires_in: number; refresh_token?: string };
  await db.account.update({
    where: { id: account.id },
    data: {
      access_token: data.access_token,
      expires_at: now + data.expires_in,
      ...(data.refresh_token ? { refresh_token: data.refresh_token } : {}),
    },
  });
  return data.access_token;
}

export async function getBusyIntervals(userId: string, from: Date, to: Date) {
  const token = await getCalendarToken(userId);
  if (!token) return [];
  const res = await fetch(`${CAL_API}/freeBusy`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ timeMin: from.toISOString(), timeMax: to.toISOString(), items: [{ id: "primary" }] }),
    cache: "no-store",
  });
  if (!res.ok) {
    console.error("[google] freeBusy selhalo", res.status);
    return [];
  }
  const data = (await res.json()) as { calendars?: { primary?: { busy?: { start: string; end: string }[] } } };
  return (data.calendars?.primary?.busy ?? []).map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
}

export async function createCalendarEvent(
  userId: string,
  ev: { summary: string; description: string; start: Date; end: Date; attendees: string[]; requestId: string },
) {
  const token = await getCalendarToken(userId);
  if (!token) return null;
  const res = await fetch(`${CAL_API}/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: ev.summary,
      description: ev.description,
      start: { dateTime: ev.start.toISOString() },
      end: { dateTime: ev.end.toISOString() },
      attendees: ev.attendees.map((email) => ({ email })),
      conferenceData: {
        createRequest: { requestId: ev.requestId, conferenceSolutionKey: { type: "hangoutsMeet" } },
      },
      reminders: { useDefault: true },
    }),
  });
  if (!res.ok) {
    console.error("[google] vytvoření události selhalo", res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as { id: string; hangoutLink?: string };
  return { id: data.id, meetLink: data.hangoutLink ?? null };
}

export async function deleteCalendarEvent(userId: string, eventId: string) {
  const token = await getCalendarToken(userId);
  if (!token) return;
  await fetch(`${CAL_API}/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  }).catch((e) => console.error("[google] smazání události selhalo", e));
}
