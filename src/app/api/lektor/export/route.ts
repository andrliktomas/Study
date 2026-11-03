import { csvResponse } from "@/lib/csv";
import { db } from "@/lib/db";
import { TOO_MANY, rateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";
import { EXPORTS, tutorExportCsv, type ExportKind } from "@/lib/tutor-export";

export const dynamic = "force-dynamic";

/** Lektor si stáhne své studenty, lekce nebo platby jako tabulku (CSV). */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Nepřihlášen", { status: 401 });
  const profile = await db.tutorProfile.findUnique({ where: { userId: user.id }, select: { id: true, slug: true } });
  if (!profile) return new Response("Jen pro lektory", { status: 403 });

  const kind = new URL(req.url).searchParams.get("co") ?? "";
  if (!(kind in EXPORTS)) return new Response("Neznámý export", { status: 400 });
  if (!(await rateLimit(`export:${user.id}`, 30, 3600))) return new Response(TOO_MANY, { status: 429 });

  const body = await tutorExportCsv(profile.id, kind as ExportKind, user.timezone);
  const today = new Date().toISOString().slice(0, 10);
  return csvResponse(body, `lektorium-${kind}-${today}.csv`);
}
