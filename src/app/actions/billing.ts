"use server";

import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/FormMessage";
import { db } from "@/lib/db";
import { activeStudentCount, planById } from "@/lib/plans";
import { requireTutor } from "@/lib/session";
import { absoluteUrl } from "@/lib/site";
import { fakePaymentsEnabled, stripe, stripeEnabled } from "@/lib/stripe";
import { priceIdForLookupKey } from "@/lib/subscription";

const BACK = "/dashboard/predplatne";

async function ensureCustomer(profile: { id: string; stripeCustomerId: string | null; legalName: string | null; street: string | null; cityName: string | null; zip: string | null; country: string; vatId: string | null }, user: { email: string; name: string | null }) {
  if (profile.stripeCustomerId) return profile.stripeCustomerId;
  const customer = await stripe().customers.create({
    email: user.email,
    name: profile.legalName ?? user.name ?? undefined,
    address: profile.street ? { line1: profile.street, city: profile.cityName ?? undefined, postal_code: profile.zip ?? undefined, country: profile.country } : undefined,
    metadata: { tutorId: profile.id },
    preferred_locales: ["cs"],
  });
  await db.tutorProfile.update({ where: { id: profile.id }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

export async function choosePlan(formData: FormData) {
  const { user, profile } = await requireTutor();
  const plan = planById(String(formData.get("plan")));
  const count = await activeStudentCount(profile.id);
  if (plan.maxStudents !== null && count > plan.maxStudents) {
    redirect(`${BACK}?chyba=limit&tarif=${plan.id}`);
  }

  // Bez Stripe (vývoj, testy) tarif rovnou přepneme.
  if (!stripeEnabled) {
    if (!fakePaymentsEnabled) redirect(`${BACK}?chyba=stripe`);
    await db.tutorProfile.update({
      where: { id: profile.id },
      data:
        plan.id === "FREE"
          ? { plan: "FREE", subscriptionStatus: null, currentPeriodEnd: null, cancelAtPeriodEnd: false }
          : { plan: plan.id, subscriptionStatus: "active", currentPeriodEnd: addDays(new Date(), 30), cancelAtPeriodEnd: false },
    });
    revalidatePath("/dashboard", "layout");
    redirect(`${BACK}?zmeneno=1`);
  }

  // Přechod na Zdarma = zrušení předplatného ke konci zaplaceného období.
  if (plan.id === "FREE") {
    if (profile.stripeSubscriptionId) {
      await stripe().subscriptions.update(profile.stripeSubscriptionId, { cancel_at_period_end: true });
      await db.tutorProfile.update({ where: { id: profile.id }, data: { cancelAtPeriodEnd: true } });
    }
    revalidatePath(BACK);
    redirect(`${BACK}?zruseno=1`);
  }

  const priceId = await priceIdForLookupKey(plan.lookupKey!);

  // Už předplácí → změníme cenu (doplatek/přeplatek se rozpočítá do další faktury).
  if (profile.stripeSubscriptionId) {
    const sub = await stripe().subscriptions.retrieve(profile.stripeSubscriptionId);
    if (!["canceled", "incomplete_expired"].includes(sub.status)) {
      await stripe().subscriptions.update(sub.id, {
        items: [{ id: sub.items.data[0].id, price: priceId }],
        cancel_at_period_end: false,
        proration_behavior: "create_prorations",
        metadata: { tutorId: profile.id },
      });
      await db.tutorProfile.update({ where: { id: profile.id }, data: { plan: plan.id, cancelAtPeriodEnd: false } });
      revalidatePath("/dashboard", "layout");
      redirect(`${BACK}?zmeneno=1`);
    }
  }

  const customer = await ensureCustomer(profile, user);
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: profile.id,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { metadata: { tutorId: profile.id } },
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
    customer_update: { address: "auto", name: "auto" },
    locale: "cs",
    success_url: absoluteUrl(`${BACK}?zaplaceno=1`),
    cancel_url: absoluteUrl(BACK),
  });
  redirect(session.url!);
}

export async function resumeSubscription() {
  const { profile } = await requireTutor();
  if (stripeEnabled && profile.stripeSubscriptionId) {
    await stripe().subscriptions.update(profile.stripeSubscriptionId, { cancel_at_period_end: false });
  }
  await db.tutorProfile.update({ where: { id: profile.id }, data: { cancelAtPeriodEnd: false } });
  revalidatePath(BACK);
}

export async function openBillingPortal() {
  const { profile } = await requireTutor();
  if (!stripeEnabled || !profile.stripeCustomerId) redirect(BACK);
  const session = await stripe().billingPortal.sessions.create({ customer: profile.stripeCustomerId, return_url: absoluteUrl(BACK), locale: "cs" });
  redirect(session.url);
}

const billingSchema = z.object({
  legalName: z.string().trim().min(2, "Vyplňte jméno nebo název firmy").max(120),
  street: z.string().trim().min(2, "Vyplňte ulici").max(120),
  cityName: z.string().trim().min(2, "Vyplňte město").max(80),
  zip: z.string().trim().regex(/^[0-9 ]{3,10}$/, "Neplatné PSČ"),
  country: z.string().trim().length(2).toUpperCase().default("CZ"),
  companyId: z.string().trim().max(20).transform((v) => v || null).refine((v) => v === null || /^\d{8}$/.test(v), "IČO má 8 číslic"),
  vatId: z.string().trim().toUpperCase().max(20).transform((v) => v || null),
  birthDate: z
    .string()
    .trim()
    .transform((v) => (v ? new Date(v) : null))
    .refine((v) => v === null || (!Number.isNaN(v.getTime()) && v < new Date()), "Neplatné datum narození"),
});

export async function saveBillingDetails(_: FormState, formData: FormData): Promise<FormState> {
  const { profile } = await requireTutor();
  const parsed = billingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (!d.companyId && !d.birthDate) return { error: "Vyplňte IČO, nebo (pokud nepodnikáte na IČO) datum narození." };

  await db.tutorProfile.update({ where: { id: profile.id }, data: d });
  if (stripeEnabled && profile.stripeCustomerId) {
    await stripe().customers.update(profile.stripeCustomerId, {
      name: d.legalName,
      address: { line1: d.street, city: d.cityName, postal_code: d.zip, country: d.country },
    });
  }
  revalidatePath(BACK);
  return { ok: true, message: "Fakturační údaje uloženy." };
}
