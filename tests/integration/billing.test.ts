// Integrační test fakturace předplatného proti databázi (DATABASE_URL = testovací DB).
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { addDays, addHours } from "date-fns";
import { BillingError, RENEWAL_DUE_DAYS, changePlan, markInvoicePaid, runBilling } from "../../src/lib/billing";
import { db } from "../../src/lib/db";
import { effectivePlan } from "../../src/lib/plans";

// účty provozovatele se čtou z prostředí až při vystavení faktury
process.env.OPERATOR_IBAN_CZK = "CZ6508000000192000145399";
process.env.OPERATOR_BIC_CZK = "GIBACZPX";
process.env.OPERATOR_IBAN_EUR = "DE89370400440532013000";
console.info = () => {}; // e-maily se v testu jen vypisují

const TAG = `bill-${Date.now()}`;
let tutorId = "";

async function profile() {
  return db.tutorProfile.findUniqueOrThrow({ where: { id: tutorId } });
}

before(async () => {
  const u = await db.user.create({
    data: {
      email: `${TAG}@example.com`,
      name: "Fakturační Lektor",
      tutorProfile: { create: { slug: TAG, legalName: "Fakturační Lektor", street: "Ulice 1", cityName: "Praha", zip: "11000" } },
    },
    include: { tutorProfile: true },
  });
  tutorId = u.tutorProfile!.id;
});

beforeEach(async () => {
  await db.invoice.deleteMany({ where: { tutorId } });
  await db.enrollment.deleteMany({ where: { tutorId } });
  await db.tutorProfile.update({ where: { id: tutorId }, data: { plan: "FREE", nextPlan: null, paidUntil: null, planActiveUntil: null, billingCurrency: "czk" } });
});

after(async () => {
  await db.invoice.deleteMany({ where: { tutorId } });
  await db.user.deleteMany({ where: { email: { startsWith: TAG } } });
  await db.$disconnect();
});

test("první faktura: tarif platí hned do splatnosti, po zaplacení do konce období", async () => {
  const now = new Date();
  const { invoice } = await changePlan(tutorId, "START", now);
  assert.ok(invoice);
  assert.equal(invoice.kind, "FIRST");
  assert.equal(invoice.amountCents, 24900);
  assert.match(invoice.number, /^\d{8}$/);
  let p = await profile();
  assert.equal(effectivePlan(p).id, "START");
  assert.equal(p.planActiveUntil?.getTime(), invoice.dueAt.getTime());

  await markInvoicePaid(invoice.id);
  p = await profile();
  assert.equal(p.paidUntil?.getTime(), invoice.periodEnd.getTime());
  assert.equal(p.planActiveUntil?.getTime(), invoice.periodEnd.getTime());
});

test("nezaplacená první faktura po splatnosti → Zdarma, další výběr už bez lhůty", async () => {
  const now = new Date();
  const { invoice } = await changePlan(tutorId, "PRO", now);
  await runBilling(addHours(invoice!.dueAt, 1));
  assert.equal((await db.invoice.findUniqueOrThrow({ where: { id: invoice!.id } })).status, "EXPIRED");
  let p = await profile();
  assert.equal(effectivePlan(p, addHours(invoice!.dueAt, 1)).id, "FREE");

  await changePlan(tutorId, "START", addHours(invoice!.dueAt, 2));
  p = await profile();
  assert.equal(p.planActiveUntil, null, "po nezaplacené faktuře se tarif aktivuje až po platbě");
});

test("navýšení během období = poměrný doplatek, snížení od dalšího období", async () => {
  const now = new Date();
  const { invoice } = await changePlan(tutorId, "START", now);
  await markInvoicePaid(invoice!.id);

  // v polovině období na Profi: doplatek ≈ (499 − 249) / 2
  const half = new Date(now.getTime() + (invoice!.periodEnd.getTime() - now.getTime()) / 2);
  const up = await changePlan(tutorId, "PRO", half);
  assert.equal(up.invoice?.kind, "UPGRADE");
  assert.ok(Math.abs(up.invoice!.amountCents - 12500) <= 200, `doplatek ${up.invoice!.amountCents}`);
  assert.equal((await profile()).plan, "PRO");

  await changePlan(tutorId, "START", half);
  const p = await profile();
  assert.equal(p.plan, "PRO");
  assert.equal(p.nextPlan, "START");
});

test("obnova: faktura 7 dní předem, nové období s nižším tarifem, neuhrazená obnova → Zdarma", async () => {
  const now = new Date();
  const { invoice } = await changePlan(tutorId, "PRO", now);
  await markInvoicePaid(invoice!.id);
  await changePlan(tutorId, "START", now); // od dalšího období
  const paidUntil = (await profile()).paidUntil!;

  await runBilling(addDays(paidUntil, -10));
  assert.equal(await db.invoice.count({ where: { tutorId, kind: "RENEWAL" } }), 0, "ještě brzy na obnovu");

  await runBilling(addDays(paidUntil, -6));
  const renewal = await db.invoice.findFirstOrThrow({ where: { tutorId, kind: "RENEWAL" } });
  assert.equal(renewal.plan, "START");
  assert.equal(renewal.amountCents, 24900);
  assert.equal(renewal.periodStart.getTime(), paidUntil.getTime());
  await runBilling(addDays(paidUntil, -5));
  assert.equal(await db.invoice.count({ where: { tutorId, kind: "RENEWAL" } }), 1, "obnova se nevystaví dvakrát");

  await runBilling(addHours(paidUntil, 1));
  let p = await profile();
  assert.equal(p.plan, "START");
  assert.equal(p.nextPlan, null);
  assert.equal(effectivePlan(p, addHours(paidUntil, 1)).id, "START", "během splatnosti obnovy tarif platí");

  await runBilling(addHours(addDays(paidUntil, RENEWAL_DUE_DAYS), 1));
  p = await profile();
  assert.equal(effectivePlan(p, addHours(addDays(paidUntil, RENEWAL_DUE_DAYS), 1)).id, "FREE");
});

test("zrušení předplatného: tarif doběhne do konce období", async () => {
  const now = new Date();
  const { invoice } = await changePlan(tutorId, "START", now);
  await markInvoicePaid(invoice!.id);
  await changePlan(tutorId, "FREE", now);
  let p = await profile();
  assert.equal(p.nextPlan, "FREE");
  assert.equal(effectivePlan(p, now).id, "START");

  await runBilling(addDays(p.paidUntil!, -6));
  assert.equal(await db.invoice.count({ where: { tutorId, kind: "RENEWAL" } }), 0, "zrušené předplatné se neobnovuje");
  await runBilling(addHours(p.paidUntil!, 1));
  p = await profile();
  assert.equal(p.plan, "FREE");
});

test("na nižší tarif nejde s více aktivními studenty, než dovoluje", async () => {
  const { invoice } = await changePlan(tutorId, "START", new Date());
  await markInvoicePaid(invoice!.id);
  for (let i = 0; i < 4; i++) {
    const s = await db.user.create({ data: { email: `${TAG}-s${i}@example.com` } });
    await db.enrollment.create({ data: { tutorId, studentId: s.id } });
  }
  await assert.rejects(changePlan(tutorId, "FREE"), BillingError);
});

test("čísla faktur jsou unikátní i při souběhu", async () => {
  const users = await Promise.all(
    [0, 1, 2, 3, 4].map((i) =>
      db.user.create({
        data: { email: `${TAG}-par${i}@example.com`, tutorProfile: { create: { slug: `${TAG}-par${i}`, legalName: "X", street: "Y" } } },
        include: { tutorProfile: true },
      }),
    ),
  );
  const results = await Promise.all(users.map((u) => changePlan(u.tutorProfile!.id, "START")));
  const numbers = results.map((r) => r.invoice!.number);
  assert.equal(new Set(numbers).size, numbers.length);
  await db.invoice.deleteMany({ where: { number: { in: numbers } } });
});
