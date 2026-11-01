import { db } from "./db";

export type PlanId = "FREE" | "START" | "PRO" | "UNLIMITED";

export type Plan = {
  id: PlanId;
  name: string;
  /** měsíční cena v haléřích / centech podle měny fakturace (včetně případné DPH) */
  prices: { czk: number; eur: number };
  /** maximální počet aktivních (nearchivovaných) studentů; null = bez omezení */
  maxStudents: number | null;
  highlight?: boolean;
};

export const BILLING_CURRENCIES = ["czk", "eur"] as const;
export type BillingCurrency = (typeof BILLING_CURRENCIES)[number];

// Ceník předplatného – upravte zde.
export const PLANS: Plan[] = [
  { id: "FREE", name: "Zdarma", prices: { czk: 0, eur: 0 }, maxStudents: 3 },
  { id: "START", name: "Start", prices: { czk: 24900, eur: 990 }, maxStudents: 10 },
  { id: "PRO", name: "Profi", prices: { czk: 49900, eur: 1990 }, maxStudents: 25, highlight: true },
  { id: "UNLIMITED", name: "Neomezeně", prices: { czk: 89900, eur: 3590 }, maxStudents: null },
];

export const PLAN_FEATURES = [
  "Veřejný profil v katalogu",
  "Balíčky lekcí a zkušební lekce",
  "Rezervace s Google Kalendářem",
  "Platby převodem v CZK, EUR, USD a dalších měnách",
  "Poznámky, úkoly a zprávy se studenty",
  "Bez provize z vašich lekcí",
];

export function planById(id: string | null | undefined): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export function planPrice(plan: Plan, currency: string) {
  return currency.toLowerCase() === "eur" ? plan.prices.eur : plan.prices.czk;
}

/**
 * Tarif, který lektor reálně má: placený tarif platí do `planActiveUntil`
 * (konec zaplaceného období, nebo lhůta splatnosti nové faktury), pak spadne na Zdarma.
 */
export function effectivePlan(profile: { plan: string; planActiveUntil: Date | null }, now = new Date()): Plan {
  const plan = planById(profile.plan);
  if (plan.id === "FREE") return plan;
  return profile.planActiveUntil && profile.planActiveUntil > now ? plan : PLANS[0];
}

export function activeStudentCount(tutorId: string) {
  return db.enrollment.count({ where: { tutorId, archivedAt: null } });
}

export async function studentCapacity(tutorId: string) {
  const profile = await db.tutorProfile.findUniqueOrThrow({
    where: { id: tutorId },
    select: { plan: true, planActiveUntil: true },
  });
  const plan = effectivePlan(profile);
  const count = await activeStudentCount(tutorId);
  const full = plan.maxStudents !== null && count >= plan.maxStudents;
  return { plan, count, limit: plan.maxStudents, full };
}
