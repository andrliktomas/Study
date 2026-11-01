import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

function csv(v: unknown) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Podklad pro roční hlášení DAC7: lektoři, jejich identifikační údaje a úhrnné částky
 * za lekce zaplacené přes platformu po čtvrtletích (bez ručně připsaných a testovacích plateb).
 * Samotné hlášení se podává přes portál Finanční správy – ověřte formát s daňovým poradcem.
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const me = session?.user?.id ? await db.user.findUnique({ where: { id: session.user.id } }) : null;
  if (me?.role !== "ADMIN") return new Response("Forbidden", { status: 403 });

  const year = Number(new URL(req.url).searchParams.get("rok")) || new Date().getFullYear() - 1;
  const from = new Date(Date.UTC(year, 0, 1));
  const to = new Date(Date.UTC(year + 1, 0, 1));

  const purchases = await db.purchase.findMany({
    where: { status: { in: ["PAID", "REFUNDED"] }, source: { in: ["STRIPE", "TRANSFER"] }, paidAt: { gte: from, lt: to } },
    select: { tutorId: true, amountCents: true, refundedCents: true, currency: true, paidAt: true },
  });
  const tutors = await db.tutorProfile.findMany({
    where: { id: { in: [...new Set(purchases.map((p) => p.tutorId))] } },
    include: { user: { select: { email: true, name: true } } },
  });

  const header = ["lektor_id", "jmeno_nazev", "email", "ulice", "mesto", "psc", "zeme", "ico", "dic", "datum_narozeni", "iban", "mena", "pocet_plateb", "q1", "q2", "q3", "q4", "celkem"];
  const rows: string[][] = [];
  for (const t of tutors) {
    const mine = purchases.filter((p) => p.tutorId === t.id);
    for (const currency of [...new Set(mine.map((p) => p.currency))]) {
      const list = mine.filter((p) => p.currency === currency);
      const q = [0, 0, 0, 0];
      for (const p of list) q[Math.floor(p.paidAt!.getUTCMonth() / 3)] += p.amountCents - p.refundedCents;
      rows.push([
        t.id, t.legalName ?? t.user.name ?? "", t.user.email, t.street ?? "", t.cityName ?? "", t.zip ?? "", t.country,
        t.companyId ?? "", t.vatId ?? "", t.birthDate?.toISOString().slice(0, 10) ?? "", t.bankIban ?? "",
        currency.toUpperCase(), String(list.length), ...q.map((c) => (c / 100).toFixed(2)), (q.reduce((a, b) => a + b, 0) / 100).toFixed(2),
      ]);
    }
  }
  const body = "﻿" + [header, ...rows].map((r) => r.map(csv).join(";")).join("\n");
  return new Response(body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="dac7-${year}.csv"` },
  });
}
