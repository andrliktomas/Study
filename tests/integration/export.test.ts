// Integrační test exportu lektora do tabulky (DATABASE_URL by měla mířit na testovací DB).
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { addDays } from "date-fns";
import { db } from "../../src/lib/db";
import { tutorExportCsv } from "../../src/lib/tutor-export";

const TAG = `it-export-${Date.now()}`;
const TZ = "Europe/Prague";
let tutorId = "";
let janaId = "";

/** Minimální CSV parser (uvozovky, středník, CRLF) – jen pro test. */
function parse(csv: string) {
  const rows: string[][] = [[]];
  let cell = "";
  let quoted = false;
  const text = csv.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ";") {
      rows.at(-1)!.push(cell);
      cell = "";
    } else if (c === "\r" && text[i + 1] === "\n") {
      rows.at(-1)!.push(cell);
      cell = "";
      rows.push([]);
      i++;
    } else cell += c;
  }
  return rows.filter((r) => r.length > 0);
}

before(async () => {
  const tutor = await db.user.create({
    data: { email: `${TAG}-tutor@example.com`, name: "Exportní Lektor", timezone: TZ, tutorProfile: { create: { slug: TAG } } },
    include: { tutorProfile: true },
  });
  tutorId = tutor.tutorProfile!.id;
  const jana = await db.user.create({ data: { email: `${TAG}-jana@example.com`, name: "Jana Nováková" } });
  const petr = await db.user.create({ data: { email: `${TAG}-petr@example.com`, name: "Petr Archivní" } });
  janaId = jana.id;
  await db.enrollment.create({ data: { tutorId, studentId: jana.id, notes: "B1; chce konverzaci" } });
  await db.enrollment.create({ data: { tutorId, studentId: petr.id, archivedAt: new Date() } });
  const purchase = await db.purchase.create({
    data: { tutorId, studentId: jana.id, packageName: "10 lekcí", lessonsTotal: 10, durationMin: 45, amountCents: 450000, currency: "czk", status: "PAID", source: "TRANSFER", variableSymbol: `${Date.now()}`.slice(-10), paidAt: new Date() },
  });
  const start = new Date("2026-03-02T09:00:00Z");
  await db.lesson.create({ data: { tutorId, studentId: jana.id, purchaseId: purchase.id, startsAt: start, endsAt: new Date(start.getTime() + 45 * 60000), status: "COMPLETED", topic: "Minulý čas", homework: "Cvičení 3" } });
  const next = addDays(new Date(), 3);
  await db.lesson.create({ data: { tutorId, studentId: jana.id, purchaseId: purchase.id, startsAt: next, endsAt: new Date(next.getTime() + 45 * 60000) } });
  // cizí lektor – nesmí se v exportu objevit
  const other = await db.user.create({ data: { email: `${TAG}-cizi@example.com`, name: "Cizí", tutorProfile: { create: { slug: `${TAG}-cizi` } } }, include: { tutorProfile: true } });
  await db.enrollment.create({ data: { tutorId: other.tutorProfile!.id, studentId: petr.id } });
});

after(async () => {
  await db.user.deleteMany({ where: { email: { startsWith: TAG } } });
  await db.$disconnect();
});

test("studenti: zbývající lekce, délka, poznámka a stav – sloupce jako importní šablona", async () => {
  const rows = parse(await tutorExportCsv(tutorId, "studenti", TZ));
  assert.deepEqual(rows[0].slice(0, 5), ["Jméno", "E-mail", "Zbývající lekce", "Délka lekce (min)", "Poznámka"]);
  assert.equal(rows.length, 3, "jen vlastní studenti lektora");
  const jana = rows.find((r) => r[0] === "Jana Nováková")!;
  assert.equal(jana[1], `${TAG}-jana@example.com`);
  assert.equal(jana[2], "8", "10 lekcí − proběhlá − naplánovaná");
  assert.equal(jana[3], "45");
  assert.equal(jana[4], "B1; chce konverzaci", "poznámka se středníkem přežije");
  assert.equal(rows.find((r) => r[0] === "Petr Archivní")![5], "archiv");
});

test("lekce: datum a čas v pásmu lektora, stav česky", async () => {
  const rows = parse(await tutorExportCsv(tutorId, "lekce", TZ));
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[1].slice(0, 7), ["2026-03-02", "10:00", "10:45", "Jana Nováková", `${TAG}-jana@example.com`, "proběhla", "Minulý čas"]);
  assert.equal(rows[2][5], "naplánovaná");
});

test("platby: částka s desetinnou čárkou, stav a způsob platby", async () => {
  const rows = parse(await tutorExportCsv(tutorId, "platby", TZ));
  assert.equal(rows.length, 2);
  const [, p] = rows;
  assert.equal(p[2], "Jana Nováková");
  assert.equal(p[6], "4500,00");
  assert.equal(p[7], "CZK");
  assert.equal(p[8], "zaplaceno");
  assert.equal(p[9], "převod");
});

test("smazaný účet studenta: bez e-mailu", async () => {
  await db.user.update({ where: { id: janaId }, data: { deletedAt: new Date(), name: "Smazaný uživatel" } });
  const rows = parse(await tutorExportCsv(tutorId, "studenti", TZ));
  const deleted = rows.find((r) => r[0] === "Smazaný uživatel")!;
  assert.equal(deleted[1], "");
  assert.equal(deleted[5], "účet smazán");
});
