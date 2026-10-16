import type Stripe from "stripe";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { sendMail } from "@/lib/mail";
import { absoluteUrl } from "@/lib/site";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), sig, secret);
  } catch (e) {
    return new Response(`Webhook error: ${(e as Error).message}`, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== "paid") break;
      const purchaseId = session.metadata?.purchaseId;
      if (!purchaseId) break;
      const res = await db.purchase.updateMany({
        where: { id: purchaseId, status: "PENDING" },
        data: { status: "PAID", paidAt: new Date() },
      });
      if (res.count > 0) {
        const p = await db.purchase.findUniqueOrThrow({
          where: { id: purchaseId },
          include: { student: true, tutor: { include: { user: true } } },
        });
        await sendMail({
          to: p.tutor.user.email,
          subject: `Nová platba: ${p.student.name} – ${p.packageName}`,
          text: `${p.student.name} zaplatil(a) ${p.packageName} (${formatMoney(p.amountCents, p.currency)}).\n${absoluteUrl("/dashboard/studenti")}`,
        });
      }
      break;
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.purchaseId) {
        await db.purchase.updateMany({ where: { id: session.metadata.purchaseId, status: "PENDING" }, data: { status: "CANCELLED" } });
      }
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (pi && charge.refunded) {
        const intent = await stripe().paymentIntents.retrieve(pi);
        if (intent.metadata?.purchaseId) {
          await db.purchase.updateMany({ where: { id: intent.metadata.purchaseId }, data: { status: "REFUNDED" } });
        }
      }
      break;
    }
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      await db.tutorProfile.updateMany({
        where: { stripeAccountId: account.id },
        data: { stripeOnboarded: Boolean(account.charges_enabled && account.details_submitted) },
      });
      break;
    }
  }
  return Response.json({ received: true });
}
