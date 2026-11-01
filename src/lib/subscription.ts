import type Stripe from "stripe";
import { db } from "./db";
import { planByLookupKey } from "./plans";
import { stripe } from "./stripe";

/** Ceny předplatného ve Stripe hledáme podle lookup_key (vytvoří je `npm run stripe:setup`). */
export async function priceIdForLookupKey(lookupKey: string) {
  const prices = await stripe().prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  const price = prices.data[0];
  if (!price) throw new Error(`Ve Stripe chybí cena s lookup_key "${lookupKey}". Spusťte npm run stripe:setup.`);
  return price.id;
}

/** Promítne stav předplatného ze Stripe do profilu lektora. */
export async function syncSubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const item = sub.items.data[0];
  const plan = planByLookupKey(item?.price.lookup_key);
  const ended = ["canceled", "incomplete_expired", "unpaid"].includes(sub.status);
  // starší verze API mají current_period_end na předplatném, novější na položce
  const periodEnd =
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    (item as unknown as { current_period_end?: number } | undefined)?.current_period_end;

  await db.tutorProfile.updateMany({
    where: { OR: [{ stripeCustomerId: customerId }, ...(sub.metadata?.tutorId ? [{ id: sub.metadata.tutorId }] : [])] },
    data: ended
      ? { plan: "FREE", stripeSubscriptionId: null, subscriptionStatus: sub.status, cancelAtPeriodEnd: false, currentPeriodEnd: null }
      : {
          plan: plan?.id ?? "FREE",
          stripeCustomerId: customerId,
          stripeSubscriptionId: sub.id,
          subscriptionStatus: sub.status,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
        },
  });
}
