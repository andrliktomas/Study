"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/FormMessage";
import { BillingError, changePlan } from "@/lib/billing";
import { db } from "@/lib/db";
import { BILLING_CURRENCIES } from "@/lib/plans";
import { requireTutor } from "@/lib/session";

const BACK = "/dashboard/predplatne";

export async function choosePlan(formData: FormData) {
  const { profile } = await requireTutor();
  let message: string;
  try {
    ({ message } = await changePlan(profile.id, String(formData.get("plan"))));
  } catch (e) {
    if (e instanceof BillingError) redirect(`${BACK}?chyba=${encodeURIComponent(e.message)}`);
    throw e;
  }
  revalidatePath("/dashboard", "layout");
  revalidatePath(`/lektori/${profile.slug}`);
  redirect(`${BACK}?ok=${encodeURIComponent(message)}`);
}

const billingSchema = z.object({
  legalName: z.string().trim().min(2, "Vyplňte jméno nebo název firmy").max(120),
  street: z.string().trim().min(2, "Vyplňte ulici").max(120),
  cityName: z.string().trim().min(2, "Vyplňte město").max(80),
  zip: z.string().trim().regex(/^[0-9A-Za-z -]{3,10}$/, "Neplatné PSČ"),
  country: z.string().trim().length(2).toUpperCase().default("CZ"),
  companyId: z.string().trim().max(20).transform((v) => v || null),
  vatId: z.string().trim().toUpperCase().max(20).transform((v) => v || null),
  birthDate: z
    .string()
    .trim()
    .transform((v) => (v ? new Date(v) : null))
    .refine((v) => v === null || (!Number.isNaN(v.getTime()) && v < new Date()), "Neplatné datum narození"),
  billingCurrency: z.enum(BILLING_CURRENCIES),
});

export async function saveBillingDetails(_: FormState, formData: FormData): Promise<FormState> {
  const { profile } = await requireTutor();
  const parsed = billingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.country === "CZ" && d.companyId && !/^\d{8}$/.test(d.companyId)) return { error: "IČO má 8 číslic." };
  if (!d.companyId && !d.birthDate) return { error: "Vyplňte IČO (nebo zahraniční identifikační číslo), případně datum narození." };

  // měnu fakturace nelze měnit, dokud je otevřená faktura
  if (d.billingCurrency !== profile.billingCurrency && (await db.invoice.count({ where: { tutorId: profile.id, status: "ISSUED" } })) > 0) {
    return { error: "Měnu fakturace změníte po uhrazení otevřené faktury." };
  }
  await db.tutorProfile.update({ where: { id: profile.id }, data: d });
  revalidatePath(BACK);
  return { ok: true, message: "Fakturační údaje uloženy." };
}
