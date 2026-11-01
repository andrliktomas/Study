import type { Invoice, Prisma, TutorProfile, User } from "@prisma/client";
import { addDays, addMonths } from "date-fns";
import { serializable } from "./booking";
import { db } from "./db";
import { formatDate, formatMoney } from "./format";
import { sendMail } from "./mail";
import { type Plan, planById, planPrice } from "./plans";
import { absoluteUrl, operator, operatorAccounts, site } from "./site";

/** Splatnost první faktury – tarif platí hned, nezaplacený po této lhůtě spadne na Zdarma. */
export const FIRST_DUE_DAYS = 14;
/** Faktura na další období se vystaví tolik dní před koncem zaplaceného období. */
export const RENEWAL_LEAD_DAYS = 7;
/** Splatnost faktury za obnovu (dny od začátku nového období). */
export const RENEWAL_DUE_DAYS = 7;
/** Nevyřízené objednávky studentů placené převodem se po této době zruší. */
export const STALE_TRANSFER_DAYS = 21;

export class BillingError extends Error {}

type Tx = Prisma.TransactionClient;
type ProfileWithUser = TutorProfile & { user: User };

export type InvoiceParty = { name: string; lines: string[]; companyId?: string | null; vatId?: string | null; email?: string | null };

export function billingAccount(currency: string) {
  return operatorAccounts().find((a) => a.currency === currency) ?? null;
}

function supplierSnapshot(currency: string) {
  const account = billingAccount(currency);
  return JSON.stringify({
    name: operator.name,
    lines: [operator.address, operator.registry].filter(Boolean),
    companyId: operator.id,
    vatId: operator.vatId,
    email: operator.email,
    account,
  });
}

function customerSnapshot(p: ProfileWithUser): string {
  const party: InvoiceParty = {
    name: p.legalName || p.user.name || p.user.email,
    lines: [p.street, [p.zip, p.cityName].filter(Boolean).join(" "), p.country].filter((l): l is string => Boolean(l)),
    companyId: p.companyId,
    vatId: p.vatId,
    email: p.user.email,
  };
  return JSON.stringify(party);
}

export function parseParty(json: string): InvoiceParty & { account?: { holderName: string; iban: string; bic: string | null; bankName: string | null } | null } {
  return JSON.parse(json);
}

async function nextInvoiceNumber(tx: Tx, now: Date) {
  const year = now.getFullYear();
  const counter = await tx.invoiceCounter.upsert({ where: { year }, create: { year, last: 1 }, update: { last: { increment: 1 } } });
  // číslo slouží i jako variabilní symbol (max. 10 číslic)
  return `${year}${String(counter.last).padStart(4, "0")}`;
}

async function issueInvoice(
  tx: Tx,
  p: ProfileWithUser,
  data: { kind: "FIRST" | "RENEWAL" | "UPGRADE"; plan: Plan; previousPlan?: string | null; amountCents: number; periodStart: Date; periodEnd: Date; dueAt: Date },
  now: Date,
) {
  return tx.invoice.create({
    data: {
      number: await nextInvoiceNumber(tx, now),
      tutorId: p.id,
      kind: data.kind,
      plan: data.plan.id,
      previousPlan: data.previousPlan ?? null,
      currency: p.billingCurrency,
      amountCents: data.amountCents,
      vatRate: operator.vatId ? operator.vatRate : 0,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      issuedAt: now,
      dueAt: data.dueAt,
      supplier: supplierSnapshot(p.billingCurrency),
      customer: customerSnapshot(p),
    },
  });
}

const later = (a: Date | null, b: Date) => (a && a > b ? a : b);

/**
 * Změna tarifu lektorem.
 * - Ze Zdarma (nebo bez zaplaceného období) → faktura na měsíc, tarif platí hned do splatnosti.
 * - Během zaplaceného období na vyšší tarif → doplatek za zbytek období, tarif platí hned.
 * - Na nižší tarif nebo Zdarma → změna od dalšího období.
 */
export async function changePlan(tutorId: string, planId: string, now = new Date()) {
  const target = planById(planId);
  const result = await serializable(async (tx) => {
    const p = await tx.tutorProfile.findUniqueOrThrow({ where: { id: tutorId }, include: { user: true } });
    const count = await tx.enrollment.count({ where: { tutorId, archivedAt: null } });
    if (target.maxStudents !== null && count > target.maxStudents) {
      throw new BillingError(`Tarif ${target.name} je pro ${target.maxStudents} studentů, vy jich máte ${count} aktivních. Nejdřív některé archivujte.`);
    }
    const current = planById(p.plan);
    const paidActive = Boolean(p.paidUntil && p.paidUntil > now);
    const open = await tx.invoice.findMany({ where: { tutorId, status: "ISSUED" }, orderBy: { issuedAt: "desc" } });
    const openFirst = open.find((i) => i.kind === "FIRST");
    const openUpgrade = open.find((i) => i.kind === "UPGRADE");
    const openRenewal = open.find((i) => i.kind === "RENEWAL");
    const cancel = (ids: string[]) => (ids.length ? tx.invoice.updateMany({ where: { id: { in: ids } }, data: { status: "CANCELLED" } }) : null);

    // ---- zrušení předplatného
    if (target.id === "FREE") {
      if (current.id === "FREE" && !openFirst) return { message: "Tarif Zdarma už máte." };
      await cancel(open.map((i) => i.id));
      const basePlan = openUpgrade?.previousPlan ?? (openFirst ? "FREE" : p.plan);
      if (paidActive && basePlan !== "FREE") {
        await tx.tutorProfile.update({ where: { id: tutorId }, data: { plan: basePlan, nextPlan: "FREE", planActiveUntil: p.paidUntil } });
        return { message: `Předplatné skončí ${formatDate(p.paidUntil!)}, pak přejdete na tarif Zdarma.` };
      }
      await tx.tutorProfile.update({ where: { id: tutorId }, data: { plan: "FREE", nextPlan: null, planActiveUntil: null } });
      return { message: "Přešli jste na tarif Zdarma." };
    }

    if (!p.legalName || !p.street) {
      throw new BillingError("Nejdřív prosím vyplňte fakturační údaje (níže na této stránce).");
    }
    if (!billingAccount(p.billingCurrency)) {
      throw new BillingError(`Platby předplatného v ${p.billingCurrency.toUpperCase()} zatím nepřijímáme. Zvolte jinou měnu fakturace.`);
    }

    // ---- stejný tarif: jen obnovení zrušeného předplatného
    if (target.id === current.id && (paidActive || openFirst)) {
      if (p.nextPlan) {
        await tx.tutorProfile.update({ where: { id: tutorId }, data: { nextPlan: null } });
        return { message: "Předplatné bude dál pokračovat." };
      }
      return { message: `Tarif ${target.name} už máte.` };
    }

    const targetPrice = planPrice(target, p.billingCurrency);
    const currentPrice = planPrice(current, p.billingCurrency);

    // ---- během zaplaceného období
    if (paidActive) {
      if (targetPrice > currentPrice) {
        const basePlan = planById(openUpgrade?.previousPlan ?? p.plan);
        const basePrice = planPrice(basePlan, p.billingCurrency);
        await cancel([openUpgrade?.id, openRenewal?.id].filter((x): x is string => Boolean(x)));
        const periodStartOfCurrent = addMonths(p.paidUntil!, -1);
        const totalMs = p.paidUntil!.getTime() - periodStartOfCurrent.getTime();
        const remainingMs = p.paidUntil!.getTime() - now.getTime();
        // doplatek zaokrouhlený na celé koruny / eura – u převodů se lépe zadává
        const amount = Math.round(((targetPrice - basePrice) * remainingMs) / totalMs / 100) * 100;
        let invoice: Invoice | null = null;
        if (amount >= 100) {
          invoice = await issueInvoice(
            tx,
            p,
            { kind: "UPGRADE", plan: target, previousPlan: basePlan.id, amountCents: amount, periodStart: now, periodEnd: p.paidUntil!, dueAt: addDays(now, FIRST_DUE_DAYS) },
            now,
          );
        }
        await tx.tutorProfile.update({ where: { id: tutorId }, data: { plan: target.id, nextPlan: null } });
        return { invoice, message: invoice ? `Tarif ${target.name} platí hned. Doplatek za zbytek období: ${formatMoney(amount, p.billingCurrency)}.` : `Tarif ${target.name} platí hned.` };
      }
      // nižší placený tarif od dalšího období
      await cancel(openRenewal ? [openRenewal.id] : []);
      await tx.tutorProfile.update({ where: { id: tutorId }, data: { nextPlan: target.id } });
      return { message: `Od ${formatDate(p.paidUntil!)} přejdete na tarif ${target.name}.` };
    }

    // ---- bez zaplaceného období: faktura na první měsíc
    await cancel(open.map((i) => i.id));
    const hadUnpaid = (await tx.invoice.count({ where: { tutorId, status: "EXPIRED" } })) > 0;
    const dueAt = openFirst?.dueAt ?? addDays(now, FIRST_DUE_DAYS);
    const invoice = await issueInvoice(
      tx,
      p,
      { kind: "FIRST", plan: target, amountCents: targetPrice, periodStart: now, periodEnd: addMonths(now, 1), dueAt },
      now,
    );
    await tx.tutorProfile.update({
      where: { id: tutorId },
      // po dříve nezaplacené faktuře se tarif aktivuje až po připsání platby
      data: { plan: target.id, nextPlan: null, planActiveUntil: hadUnpaid ? null : dueAt },
    });
    return {
      invoice,
      message: hadUnpaid
        ? `Vystavili jsme fakturu ${invoice.number}. Tarif ${target.name} se aktivuje po připsání platby.`
        : `Tarif ${target.name} platí hned. Fakturu ${invoice.number} prosím uhraďte do ${formatDate(dueAt)}.`,
    };
  });

  if (result.invoice) await sendInvoiceEmail(result.invoice.id);
  return result;
}

/** Admin potvrdí přijetí platby (i po splatnosti – tarif se znovu aktivuje). */
export async function markInvoicePaid(invoiceId: string, paidAt = new Date()) {
  const now = new Date();
  const inv = await serializable(async (tx) => {
    const inv = await tx.invoice.findUnique({ where: { id: invoiceId } });
    if (!inv || !["ISSUED", "EXPIRED"].includes(inv.status)) return null;
    await tx.invoice.update({ where: { id: inv.id }, data: { status: "PAID", paidAt } });
    if (inv.tutorId) {
      const p = await tx.tutorProfile.findUnique({ where: { id: inv.tutorId } });
      if (p) {
        const current = inv.periodStart <= now && inv.periodEnd > now;
        await tx.tutorProfile.update({
          where: { id: p.id },
          data: {
            paidUntil: later(p.paidUntil, inv.periodEnd),
            planActiveUntil: later(p.planActiveUntil, inv.periodEnd),
            // faktura za právě běžící období určuje tarif (u obnovy i ruší naplánovanou změnu)
            ...(current ? { plan: inv.plan, ...(inv.kind === "RENEWAL" ? { nextPlan: null } : {}) } : {}),
          },
        });
        if (inv.kind === "RENEWAL" && current) await tx.invoice.update({ where: { id: inv.id }, data: { appliedAt: now } });
      }
    }
    return inv;
  });
  if (inv?.tutorId) {
    const p = await db.tutorProfile.findUnique({ where: { id: inv.tutorId }, include: { user: true } });
    if (p) {
      await sendMail({
        to: p.user.email,
        subject: `Platba přijata – faktura ${inv.number}`,
        text: `Dobrý den,\n\nděkujeme, platbu za fakturu ${inv.number} (${formatMoney(inv.amountCents, inv.currency)}) jsme přijali. Tarif ${planById(inv.plan).name} máte zaplacený do ${formatDate(inv.periodEnd)}.\n\n${absoluteUrl("/dashboard/predplatne")}`,
      });
    }
  }
  return inv;
}

export async function cancelInvoice(invoiceId: string) {
  const inv = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!inv || inv.status !== "ISSUED") return;
  await db.invoice.update({ where: { id: inv.id }, data: { status: "CANCELLED" } });
  if (!inv.tutorId) return;
  const p = await db.tutorProfile.findUnique({ where: { id: inv.tutorId } });
  if (!p) return;
  // stornovaná faktura nesmí dál prodlužovat tarif
  if (inv.kind === "UPGRADE" && inv.previousPlan && p.plan === inv.plan) {
    await db.tutorProfile.update({ where: { id: p.id }, data: { plan: inv.previousPlan } });
  } else if (inv.kind === "FIRST" && !(p.paidUntil && p.paidUntil > new Date())) {
    await db.tutorProfile.update({ where: { id: p.id }, data: { plan: "FREE", planActiveUntil: null } });
  }
}

export function invoicePaymentText(inv: Pick<Invoice, "number" | "amountCents" | "currency" | "dueAt" | "supplier">) {
  const acc = parseParty(inv.supplier).account;
  return [
    `Částka: ${formatMoney(inv.amountCents, inv.currency)}`,
    acc ? `Příjemce: ${acc.holderName}` : null,
    acc ? `IBAN: ${acc.iban}` : null,
    acc?.bic ? `SWIFT/BIC: ${acc.bic}` : null,
    `Variabilní symbol: ${inv.number}`,
    `Splatnost: ${formatDate(inv.dueAt)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function sendInvoiceEmail(invoiceId: string, reminder = false) {
  const inv = await db.invoice.findUnique({ where: { id: invoiceId }, include: { tutor: { include: { user: true } } } });
  if (!inv?.tutor) return;
  await sendMail({
    to: inv.tutor.user.email,
    subject: reminder
      ? `Připomínka: faktura ${inv.number} je splatná ${formatDate(inv.dueAt)}`
      : `Faktura ${inv.number} – ${site.name}, tarif ${planById(inv.plan).name}`,
    text: `Dobrý den,\n\n${reminder ? "připomínáme úhradu faktury" : "posíláme fakturu"} ${inv.number} za předplatné ${site.name} (tarif ${planById(inv.plan).name}, období ${formatDate(inv.periodStart)} – ${formatDate(inv.periodEnd)}).\n\n${invoicePaymentText(inv)}\n\nFaktura s QR kódem pro platbu: ${absoluteUrl(`/dashboard/predplatne/faktura/${inv.id}`)}\n\nPokud nebude faktura uhrazena do splatnosti, tarif přejde na Zdarma (do ${planById("FREE").maxStudents} aktivních studentů).`,
  });
}

/**
 * Hodinový běh fakturace (cron): vypršení nezaplacených faktur, vystavení obnov,
 * přechod na nové období, konec zrušených předplatných, připomínky a staré objednávky studentů.
 */
export async function runBilling(now = new Date()) {
  const stats = { expired: 0, renewals: 0, applied: 0, ended: 0, reminders: 0, staleTransfers: 0 };

  // 1) nezaplacené faktury po splatnosti
  const overdue = await db.invoice.findMany({ where: { status: "ISSUED", dueAt: { lte: now } } });
  for (const inv of overdue) {
    const claimed = await db.invoice.updateMany({ where: { id: inv.id, status: "ISSUED" }, data: { status: "EXPIRED" } });
    if (claimed.count === 0 || !inv.tutorId) continue;
    stats.expired++;
    const p = await db.tutorProfile.findUnique({ where: { id: inv.tutorId }, include: { user: true } });
    if (!p) continue;
    if (inv.kind === "UPGRADE") {
      if (p.plan === inv.plan && inv.previousPlan) await db.tutorProfile.update({ where: { id: p.id }, data: { plan: inv.previousPlan } });
    } else if (!(p.paidUntil && p.paidUntil > now)) {
      await db.tutorProfile.update({ where: { id: p.id }, data: { plan: "FREE", nextPlan: null, planActiveUntil: p.paidUntil } });
    }
    await sendMail({
      to: p.user.email,
      subject: `Faktura ${inv.number} nebyla uhrazena`,
      text: `Dobrý den,\n\nfakturu ${inv.number} (${formatMoney(inv.amountCents, inv.currency)}) jsme do splatnosti neobdrželi, ${inv.kind === "UPGRADE" ? "vrátili jsme proto váš předchozí tarif" : "váš tarif proto přešel na Zdarma"}. Stávající studenti mohou pokračovat, noví se ale nad limit nezapíšou.\n\nPokud jste už platili, napište nám na ${operator.email}. Tarif můžete kdykoli znovu zvolit: ${absoluteUrl("/dashboard/predplatne")}`,
    });
  }

  // 2) faktury na další období
  const renewing = await db.tutorProfile.findMany({
    where: { plan: { not: "FREE" }, paidUntil: { not: null, lte: addDays(now, RENEWAL_LEAD_DAYS) }, OR: [{ nextPlan: null }, { nextPlan: { not: "FREE" } }] },
    include: { user: true },
  });
  for (const p of renewing) {
    const exists = await db.invoice.count({ where: { tutorId: p.id, periodStart: { gte: p.paidUntil! }, status: { not: "CANCELLED" } } });
    if (exists > 0 || !billingAccount(p.billingCurrency)) continue;
    const plan = planById(p.nextPlan ?? p.plan);
    if (plan.id === "FREE") continue;
    const dueAt = addDays(p.paidUntil!, RENEWAL_DUE_DAYS);
    const inv = await serializable((tx) =>
      issueInvoice(tx, p, { kind: "RENEWAL", plan, amountCents: planPrice(plan, p.billingCurrency), periodStart: p.paidUntil!, periodEnd: addMonths(p.paidUntil!, 1), dueAt }, now),
    );
    // během splatnosti obnovy má lektor tarif dál k dispozici
    await db.tutorProfile.update({ where: { id: p.id }, data: { planActiveUntil: later(p.planActiveUntil, dueAt) } });
    await sendInvoiceEmail(inv.id);
    stats.renewals++;
  }

  // 3) začátek nového období – tarif z faktury za obnovu
  const starting = await db.invoice.findMany({ where: { kind: "RENEWAL", appliedAt: null, periodStart: { lte: now }, status: { in: ["ISSUED", "PAID"] } } });
  for (const inv of starting) {
    await db.invoice.update({ where: { id: inv.id }, data: { appliedAt: now } });
    if (!inv.tutorId) continue;
    const p = await db.tutorProfile.findUnique({ where: { id: inv.tutorId } });
    if (!p) continue;
    await db.tutorProfile.update({
      where: { id: p.id },
      data: { plan: inv.plan, nextPlan: null, planActiveUntil: later(p.planActiveUntil, inv.status === "PAID" ? inv.periodEnd : inv.dueAt) },
    });
    stats.applied++;
  }

  // 4) konec zrušených předplatných
  const ending = await db.tutorProfile.findMany({ where: { nextPlan: "FREE", paidUntil: { lte: now } }, include: { user: true } });
  for (const p of ending) {
    await db.tutorProfile.update({ where: { id: p.id }, data: { plan: "FREE", nextPlan: null } });
    await sendMail({
      to: p.user.email,
      subject: "Předplatné skončilo",
      text: `Dobrý den,\n\nvaše předplatné skončilo a přešli jste na tarif Zdarma. Kdykoli se můžete vrátit: ${absoluteUrl("/dashboard/predplatne")}`,
    });
    stats.ended++;
  }

  // 5) připomínka 3 dny před splatností
  const dueSoon = await db.invoice.findMany({
    where: { status: "ISSUED", reminderSentAt: null, dueAt: { lte: addDays(now, 3) }, issuedAt: { lte: addDays(now, -1) } },
  });
  for (const inv of dueSoon) {
    const claimed = await db.invoice.updateMany({ where: { id: inv.id, reminderSentAt: null }, data: { reminderSentAt: now } });
    if (claimed.count === 0) continue;
    await sendInvoiceEmail(inv.id, true);
    stats.reminders++;
  }

  // 6) objednávky studentů, které nikdo nezaplatil
  const stale = await db.purchase.findMany({
    where: { status: "PENDING", source: "TRANSFER", createdAt: { lte: addDays(now, -STALE_TRANSFER_DAYS) } },
    include: { student: true },
  });
  for (const pur of stale) {
    await db.purchase.update({ where: { id: pur.id }, data: { status: "CANCELLED" } });
    if (!pur.student.deletedAt) {
      await sendMail({
        to: pur.student.email,
        subject: `Objednávka zrušena: ${pur.packageName}`,
        text: `Dobrý den,\n\nobjednávku „${pur.packageName}“ (VS ${pur.variableSymbol}) jsme zrušili, protože lektor platbu do ${STALE_TRANSFER_DAYS} dnů nepotvrdil. Pokud jste platili, kontaktujte prosím lektora.`,
      });
    }
    stats.staleTransfers++;
  }

  return stats;
}
