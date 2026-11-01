import assert from "node:assert/strict";
import { test } from "node:test";
import { PLANS, effectivePlan, planById, planPrice } from "../../src/lib/plans";

test("tarify jsou seřazené podle ceny a limitu v obou měnách", () => {
  for (let i = 1; i < PLANS.length; i++) {
    assert.ok(PLANS[i].prices.czk > PLANS[i - 1].prices.czk);
    assert.ok(PLANS[i].prices.eur > PLANS[i - 1].prices.eur);
    assert.ok((PLANS[i].maxStudents ?? Infinity) > (PLANS[i - 1].maxStudents ?? Infinity));
  }
});

test("placený tarif platí jen do planActiveUntil", () => {
  const now = new Date("2026-11-01T12:00:00Z");
  assert.equal(effectivePlan({ plan: "PRO", planActiveUntil: new Date("2026-11-02T00:00:00Z") }, now).id, "PRO");
  assert.equal(effectivePlan({ plan: "PRO", planActiveUntil: new Date("2026-10-31T00:00:00Z") }, now).id, "FREE");
  assert.equal(effectivePlan({ plan: "PRO", planActiveUntil: null }, now).id, "FREE");
  assert.equal(effectivePlan({ plan: "FREE", planActiveUntil: null }, now).id, "FREE");
});

test("cena podle měny fakturace", () => {
  assert.equal(planPrice(planById("START"), "czk"), 24900);
  assert.equal(planPrice(planById("START"), "EUR"), 990);
  assert.equal(planById("neexistuje").id, "FREE");
});
