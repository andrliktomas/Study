import { headers } from "next/headers";
import { db } from "./db";

/**
 * Jednoduchý rate limit s pevným oknem uložený v databázi (funguje i při více instancích serveru).
 * Vrací true, pokud je akce povolena.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const now = new Date();
  const reset = new Date(now.getTime() + windowSec * 1000);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt") VALUES (${key}, 1, ${reset})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" < ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" < ${now} THEN ${reset} ELSE "RateLimit"."resetAt" END
    RETURNING "count"`;
  return Number(rows[0]?.count ?? 0) <= limit;
}

export function ipFromHeaders(h: { get(name: string): string | null }) {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** IP adresa klienta v server actions. */
export async function clientIp() {
  return ipFromHeaders(await headers());
}

export const TOO_MANY = "Příliš mnoho pokusů. Zkuste to prosím za chvíli.";

export async function cleanupRateLimits() {
  await db.rateLimit.deleteMany({ where: { resetAt: { lt: new Date(Date.now() - 24 * 3600 * 1000) } } });
}
