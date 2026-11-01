import { runBilling } from "@/lib/billing";
import { sendDueReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";

// Spouštějte každou hodinu (vercel.json, nebo externí cron: curl -H "Authorization: Bearer $CRON_SECRET" …/api/cron/reminders)
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  // připomínky lekcí + fakturace předplatného (obnovy, upomínky, vypršení)
  const reminders = await sendDueReminders();
  const billing = await runBilling();
  return Response.json({ ...reminders, billing });
}
