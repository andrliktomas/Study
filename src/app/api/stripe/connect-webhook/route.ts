import type Stripe from "stripe";
import { db } from "@/lib/db";
import { cancelFutureLessons, markPurchasePaid } from "@/lib/purchases";
import { stripe } from "@/lib/stripe";

// Události připojených Stripe účtů lektorů: platby studentů za lekce.
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
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
      if (session.mode !== "payment" || session.payment_status !== "paid" || !session.metadata?.purchaseId) break;
      const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
      await markPurchasePaid(session.metadata.purchaseId, { stripePaymentIntentId: pi });
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
      // Vrácení peněz provedené přímo ve Stripe (mimo aplikaci).
      const charge = event.data.object as Stripe.Charge;
      const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (!pi) break;
      const purchase = await db.purchase.findFirst({ where: { stripePaymentIntentId: pi } });
      if (!purchase || charge.amount_refunded <= purchase.refundedCents) break;
      const full = charge.amount_refunded >= charge.amount;
      await db.purchase.update({
        where: { id: purchase.id },
        data: { refundedCents: charge.amount_refunded, refundedAt: new Date(), ...(full ? { status: "REFUNDED" } : {}) },
      });
      if (full) await cancelFutureLessons({ purchaseId: purchase.id }, { reason: "Platba za lekce vám byla vrácena, naplánované lekce jsme proto zrušili." });
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
