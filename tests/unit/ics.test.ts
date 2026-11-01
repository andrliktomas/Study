import assert from "node:assert/strict";
import { test } from "node:test";
import { lessonIcs } from "../../src/lib/ics";

test(".ics obsahuje UID, SEQUENCE a časy v UTC", () => {
  const ics = lessonIcs({
    uid: "abc",
    start: new Date("2026-11-03T16:00:00Z"),
    end: new Date("2026-11-03T17:00:00Z"),
    summary: "Lekce – Jana; test",
    description: "řádek 1\nřádek 2",
    sequence: 2,
  });
  assert.match(ics, /UID:abc@/);
  assert.match(ics, /SEQUENCE:2/);
  assert.match(ics, /DTSTART:20261103T160000Z/);
  assert.match(ics, /SUMMARY:Lekce – Jana\; test/);
  assert.match(ics, /DESCRIPTION:řádek 1\\nřádek 2/);
  assert.ok(ics.includes("\r\n"));
});

test("zrušená událost", () => {
  const ics = lessonIcs({ uid: "x", start: new Date(), end: new Date(), summary: "s", description: "d", cancelled: true });
  assert.match(ics, /METHOD:CANCEL/);
  assert.match(ics, /STATUS:CANCELLED/);
});
