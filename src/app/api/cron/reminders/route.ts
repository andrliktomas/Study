import { createHash, timingSafeEqual } from "node:crypto";
import { runBilling } from "@/lib/billing";
import { sendDueReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";

// Spouštějte každou hodinu (vercel.json, nebo externí cron: curl -H "Authorization: Bearer $CRON_SECRET" …/api/cron/reminders)
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !sameSecret(req.headers.get("authorization") ?? "", `Bearer ${secret}`)) {
    return new Response("Unauthorized", { status: 401 });
  }
  // připomínky lekcí + fakturace předplatného (obnovy, upomínky, vypršení)
  const reminders = await sendDueReminders();
  const billing = await runBilling();
  return Response.json({ ...reminders, billing });
}

/** Porovnání v konstantním čase (hashe mají stejnou délku). */
function sameSecret(a: string, b: string) {
  const h = (v: string) => createHash("sha256").update(v).digest();
  return timingSafeEqual(h(a), h(b));
}
