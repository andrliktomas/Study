import assert from "node:assert/strict";
import { test } from "node:test";
import { epcString, ibanToCzAccount, isValidBic, isValidIban, normalizeAccount, paymentQr, spaydString } from "../../src/lib/bank";

test("převede český účet na IBAN (vzor ČNB)", () => {
  assert.equal(normalizeAccount("19-2000145399/0800"), "CZ6508000000192000145399");
  assert.equal(normalizeAccount(" 19-2000145399 / 0800 "), "CZ6508000000192000145399");
});

test("přijme platný IBAN s mezerami", () => {
  assert.equal(normalizeAccount("CZ65 0800 0000 1920 0014 5399"), "CZ6508000000192000145399");
  assert.ok(isValidIban("DE89370400440532013000"));
});

test("odmítne účet se špatným kontrolním součtem", () => {
  assert.equal(normalizeAccount("19-2000145398/0800"), null);
  assert.equal(normalizeAccount("CZ6508000000192000145398"), null);
  assert.equal(normalizeAccount("nesmysl"), null);
});

test("IBAN zpět na český formát", () => {
  assert.equal(ibanToCzAccount("CZ6508000000192000145399"), "19-2000145399/0800");
});

test("SPAYD řetězec pro QR platbu", () => {
  const s = spaydString({ iban: "CZ6508000000192000145399", amountCents: 250000, currency: "czk", vs: "1234567890", message: "Balíček 5 lekcí *Petr*" });
  assert.equal(s, "SPD*1.0*ACC:CZ6508000000192000145399*AM:2500.00*CC:CZK*X-VS:1234567890*MSG:Balicek 5 lekci Petr");
});

test("SWIFT/BIC", () => {
  assert.ok(isValidBic("GIBACZPX"));
  assert.ok(isValidBic("COBADEFFXXX"));
  assert.ok(isValidBic("gibaczpx"));
  assert.ok(!isValidBic("GIBACZ"));
  assert.ok(!isValidBic("1234CZPX"));
});

test("EPC QR (SEPA) – formát podle EPC069-12", () => {
  const s = epcString({ iban: "DE89370400440532013000", bic: "COBADEFFXXX", name: "Jana Nováková", amountCents: 11000, reference: "LK1234567890 Lekce" });
  assert.deepEqual(s.split("\n"), ["BCD", "002", "1", "SCT", "COBADEFFXXX", "Jana Novakova", "DE89370400440532013000", "EUR110.00", "", "", "LK1234567890 Lekce"]);
});

test("QR podle měny: CZK → SPAYD, EUR → EPC, jiné měny → bez QR", () => {
  const base = { holderName: "Jana", amountCents: 100, vs: "1", message: "x" };
  assert.equal(paymentQr({ ...base, iban: "CZ6508000000192000145399", currency: "czk" })?.kind, "spayd");
  assert.equal(paymentQr({ ...base, iban: "DE89370400440532013000", currency: "eur" })?.kind, "epc");
  assert.equal(paymentQr({ ...base, iban: "GB29NWBK60161331926819", currency: "gbp" }), null);
  assert.equal(paymentQr({ ...base, iban: null, currency: "usd" }), null);
});
