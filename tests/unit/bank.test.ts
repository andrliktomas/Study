import assert from "node:assert/strict";
import { test } from "node:test";
import { ibanToCzAccount, isValidIban, normalizeAccount, spaydString } from "../../src/lib/bank";

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
