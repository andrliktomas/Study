import assert from "node:assert/strict";
import { test } from "node:test";
import { csvAmount, csvCell, toCsv } from "../../src/lib/csv";

test("CSV pro český Excel: BOM, středník, CRLF", () => {
  const out = toCsv([["Jméno", "Lekcí"], ["Jana", 3]]);
  assert.equal(out, "\uFEFFJméno;Lekcí\r\nJana;3\r\n");
});

test("buňky se středníkem, uvozovkami a novým řádkem jsou v uvozovkách", () => {
  assert.equal(csvCell('a;b'), '"a;b"');
  assert.equal(csvCell('řekl "ahoj"'), '"řekl ""ahoj"""');
  assert.equal(csvCell("řádek 1\nřádek 2"), '"řádek 1\nřádek 2"');
  assert.equal(csvCell(null), "");
});

test("text začínající vzorcem se v Excelu nespustí, čísla zůstanou čísly", () => {
  assert.equal(csvCell("=HYPERLINK(\"x\")"), "\"'=HYPERLINK(\"\"x\"\")\"");
  assert.equal(csvCell("@SUM(A1)"), "'@SUM(A1)");
  assert.equal(csvCell("+420 777"), "'+420 777");
  assert.equal(csvCell("-12,50"), "-12,50");
  assert.equal(csvCell(-5), "-5");
});

test("částky s desetinnou čárkou", () => {
  assert.equal(csvAmount(123456), "1234,56");
  assert.equal(csvAmount(0), "0,00");
});
