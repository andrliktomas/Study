import Stripe from "stripe";

export const stripeEnabled = Boolean(process.env.STRIPE_SECRET_KEY);

// Bez Stripe klíče v developmentu (nebo s ALLOW_FAKE_PAYMENTS=1) platby i předplatné simulujeme,
// aby šla aplikace vyzkoušet end-to-end. Se Stripe klíčem se simulace nikdy nepoužije.
export const fakePaymentsEnabled =
  !stripeEnabled && (process.env.NODE_ENV !== "production" || process.env.ALLOW_FAKE_PAYMENTS === "1");

let client: Stripe | null = null;
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY není nastaven");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

/** Může lektor přijímat platby od studentů? (vlastní Stripe účet, bankovní účet, nebo simulace) */
export function canAcceptPayments(profile: { stripeOnboarded: boolean; bankIban: string | null }) {
  return profile.stripeOnboarded || Boolean(profile.bankIban) || fakePaymentsEnabled;
}

export function cardPaymentsAvailable(profile: { stripeOnboarded: boolean }) {
  return fakePaymentsEnabled || (stripeEnabled && profile.stripeOnboarded);
}
