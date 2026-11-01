// Vytvoří ve Stripe produkt a měsíční ceny tarifů podle src/lib/plans.ts.
// Použití: STRIPE_SECRET_KEY=sk_... npm run stripe:setup
import Stripe from "stripe";
import { PLANS } from "../src/lib/plans";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) throw new Error("Nastavte STRIPE_SECRET_KEY");
const stripe = new Stripe(key);

(async () => {
  const products = await stripe.products.search({ query: "metadata['app']:'lektorium'" });
  const product =
    products.data[0] ??
    (await stripe.products.create({ name: "Lektorium – předplatné pro lektory", metadata: { app: "lektorium" } }));

  for (const plan of PLANS.filter((p) => p.lookupKey)) {
    const existing = await stripe.prices.list({ lookup_keys: [plan.lookupKey!], limit: 1 });
    const current = existing.data[0];
    if (current && current.unit_amount === plan.priceCents) {
      console.log(`✓ ${plan.name}: ${current.id} (beze změny)`);
      continue;
    }
    const price = await stripe.prices.create({
      product: product.id,
      currency: "czk",
      unit_amount: plan.priceCents,
      recurring: { interval: "month" },
      nickname: plan.name,
      lookup_key: plan.lookupKey!,
      // nová cena převezme lookup_key; stávající předplatitelé zůstávají na staré ceně
      transfer_lookup_key: true,
      metadata: { plan: plan.id },
    });
    console.log(`✓ ${plan.name}: vytvořena cena ${price.id} (${plan.priceCents / 100} Kč/měs.)`);
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
