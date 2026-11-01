import { db } from "./db";

export type PlanId = "FREE" | "START" | "PRO" | "UNLIMITED";

export type Plan = {
  id: PlanId;
  name: string;
  /** měsíční cena v haléřích */
  priceCents: number;
  /** maximální počet aktivních (nearchivovaných) studentů; null = bez omezení */
  maxStudents: number | null;
  /** lookup_key ceny ve Stripe (vytvoří `npm run stripe:setup`) */
  lookupKey: string | null;
  highlight?: boolean;
};

// Ceník předplatného – upravte zde. Po změně cen spusťte `npm run stripe:setup`.
export const PLANS: Plan[] = [
  { id: "FREE", name: "Zdarma", priceCents: 0, maxStudents: 3, lookupKey: null },
  { id: "START", name: "Start", priceCents: 24900, maxStudents: 10, lookupKey: "lektorium_start_monthly" },
  { id: "PRO", name: "Profi", priceCents: 49900, maxStudents: 25, lookupKey: "lektorium_pro_monthly", highlight: true },
  { id: "UNLIMITED", name: "Neomezeně", priceCents: 89900, maxStudents: null, lookupKey: "lektorium_unlimited_monthly" },
];

export const PLAN_FEATURES = [
  "Veřejný profil v katalogu",
  "Balíčky lekcí a zkušební lekce",
  "Rezervace s Google Kalendářem",
  "Platby kartou i převodem s QR kódem",
  "Poznámky, úkoly a zprávy se studenty",
  "Bez provize z vašich lekcí",
];

export function planById(id: string | null | undefined): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export function planByLookupKey(key: string | null | undefined): Plan | undefined {
  return PLANS.find((p) => p.lookupKey && p.lookupKey === key);
}

const LIVE_STATUSES = ["active", "trialing", "past_due"];

/** Tarif, který lektor reálně má – při zrušeném nebo nezaplaceném předplatném spadne na Zdarma. */
export function effectivePlan(profile: { plan: string; subscriptionStatus: string | null }): Plan {
  const plan = planById(profile.plan);
  if (plan.id === "FREE") return plan;
  return profile.subscriptionStatus && LIVE_STATUSES.includes(profile.subscriptionStatus) ? plan : PLANS[0];
}

export function activeStudentCount(tutorId: string) {
  return db.enrollment.count({ where: { tutorId, archivedAt: null } });
}

export async function studentCapacity(tutorId: string) {
  const profile = await db.tutorProfile.findUniqueOrThrow({
    where: { id: tutorId },
    select: { plan: true, subscriptionStatus: true },
  });
  const plan = effectivePlan(profile);
  const count = await activeStudentCount(tutorId);
  const full = plan.maxStudents !== null && count >= plan.maxStudents;
  return { plan, count, limit: plan.maxStudents, full };
}
