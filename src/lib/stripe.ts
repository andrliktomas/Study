import Stripe from "stripe";

export const stripeEnabled = Boolean(process.env.STRIPE_SECRET_KEY);

// Bez Stripe klíče v developmentu (nebo s ALLOW_FAKE_PAYMENTS=1) platby simulujeme,
// aby šla aplikace vyzkoušet end-to-end. V produkci se Stripe klíčem se nikdy nepoužije.
export const fakePaymentsEnabled =
  !stripeEnabled && (process.env.NODE_ENV !== "production" || process.env.ALLOW_FAKE_PAYMENTS === "1");

let client: Stripe | null = null;
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY není nastaven");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

export function platformFeeCents(amountCents: number, percent: number) {
  return Math.round((amountCents * percent) / 100);
}
