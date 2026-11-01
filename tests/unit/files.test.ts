import assert from "node:assert/strict";
import { test } from "node:test";
import { detectMime, safeFilename } from "../../src/lib/files";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const PDF = Buffer.from("%PDF-1.7\n...");

test("pozná typ podle obsahu a přípony", () => {
  assert.equal(detectMime("foto.png", PNG, "image"), "image/png");
  assert.equal(detectMime("ukol.pdf", PDF, "attachment"), "application/pdf");
});

test("odmítne podvržený soubor", () => {
  assert.equal(detectMime("virus.pdf", Buffer.from("MZ\x90\x00"), "attachment"), null);
  assert.equal(detectMime("foto.png", PDF, "image"), null);
  assert.equal(detectMime("ukol.pdf", PDF, "image"), null);
  assert.equal(detectMime("skript.html", Buffer.from("<script>"), "attachment"), null);
});

test("bezpečný název souboru", () => {
  assert.equal(safeFilename("../../etc/passwd"), ".._.._etc_passwd");
  assert.equal(safeFilename("Úkol č. 3.pdf"), "Úkol č. 3.pdf");
});
