import assert from "node:assert/strict";
import { test } from "node:test";
import { PLANS, effectivePlan, planById, planByLookupKey } from "../../src/lib/plans";

test("tarify jsou seřazené podle ceny a limitu", () => {
  for (let i = 1; i < PLANS.length; i++) {
    assert.ok(PLANS[i].priceCents > PLANS[i - 1].priceCents);
    const prev = PLANS[i - 1].maxStudents ?? Infinity;
    assert.ok((PLANS[i].maxStudents ?? Infinity) > prev);
  }
});

test("zrušené nebo nezaplacené předplatné spadne na Zdarma", () => {
  assert.equal(effectivePlan({ plan: "PRO", subscriptionStatus: "active" }).id, "PRO");
  assert.equal(effectivePlan({ plan: "PRO", subscriptionStatus: "past_due" }).id, "PRO");
  assert.equal(effectivePlan({ plan: "PRO", subscriptionStatus: "canceled" }).id, "FREE");
  assert.equal(effectivePlan({ plan: "PRO", subscriptionStatus: null }).id, "FREE");
  assert.equal(effectivePlan({ plan: "FREE", subscriptionStatus: null }).id, "FREE");
});

test("vyhledání tarifu", () => {
  assert.equal(planById("neexistuje").id, "FREE");
  assert.equal(planByLookupKey("lektorium_pro_monthly")?.id, "PRO");
  assert.equal(planByLookupKey(null), undefined);
});
