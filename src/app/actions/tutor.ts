"use server";

import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/FormMessage";
import { db } from "@/lib/db";
import { fromZonedTime } from "date-fns-tz";
import { normalizeAccount } from "@/lib/bank";
import { BookingError, moveLesson, serializable } from "@/lib/booking";
import { CONSUMING_STATUSES } from "@/lib/credits";
import { formatMoney, hhmmToMinutes, slugify } from "@/lib/format";
import { getCalendarToken } from "@/lib/google-calendar";
import { LANGUAGES, LEVELS } from "@/lib/languages";
import { afterLessonMoved } from "@/lib/lesson-notify";
import { sendMail } from "@/lib/mail";
import { effectivePlan, studentCapacity } from "@/lib/plans";
import { cancelFutureLessons, markPurchasePaid } from "@/lib/purchases";
import { TOO_MANY, rateLimit } from "@/lib/rate-limit";
import { requireTutor } from "@/lib/session";
import { absoluteUrl, site } from "@/lib/site";
import { canAcceptPayments, stripe, stripeEnabled } from "@/lib/stripe";
import { randomToken } from "@/lib/tokens";

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .transform((v) => v || null)
  .refine((v) => v === null || /^https?:\/\//.test(v), "Odkaz musí začínat http:// nebo https://");

const profileSchema = z.object({
  headline: z.string().trim().max(120),
  bio: z.string().trim().max(5000),
  city: z.string().trim().max(80).transform((v) => v || null),
  videoLink: optionalUrl,
  slug: z.string().trim().min(3, "Adresa profilu musí mít alespoň 3 znaky").max(60),
  minNoticeHours: z.coerce.number().int().min(0).max(24 * 14),
  cancelHours: z.coerce.number().int().min(0).max(24 * 14),
});

export async function updateTutorProfile(_: FormState, formData: FormData): Promise<FormState> {
  const { profile } = await requireTutor();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const languages = formData.getAll("languages").map(String).filter((c) => LANGUAGES.some((l) => l.code === c));
  const levels = formData.getAll("levels").map(String).filter((l) => LEVELS.includes(l));
  const slug = slugify(parsed.data.slug);
  if (slug.length < 3) return { error: "Adresa profilu musí mít alespoň 3 znaky (bez diakritiky)." };
  const taken = await db.tutorProfile.findFirst({ where: { slug, NOT: { id: profile.id } } });
  if (taken) return { error: "Tato adresa profilu je už obsazená." };

  const published = formData.get("published") === "on";
  if (published && (languages.length === 0 || parsed.data.bio.length < 50)) {
    return { error: "Pro zveřejnění vyberte alespoň jeden jazyk a napište o sobě aspoň pár vět (50+ znaků)." };
  }
  if (published && !canAcceptPayments(profile)) {
    return { error: "Před zveřejněním nastavte, jak vám studenti zaplatí (bankovní účet nebo Stripe) v sekci Platby." };
  }
  if (published && (await db.lessonPackage.count({ where: { tutorId: profile.id, active: true } })) === 0) {
    return { error: "Před zveřejněním přidejte alespoň jeden balíček lekcí." };
  }

  await db.tutorProfile.update({
    where: { id: profile.id },
    data: { ...parsed.data, slug, languages: languages.join(","), levels: levels.join(","), published },
  });
  revalidatePath("/dashboard", "layout");
  revalidatePath(`/lektori/${slug}`);
  revalidatePath("/lektori");
  return { ok: true, message: published ? "Profil je uložený a zveřejněný." : "Profil je uložený (zatím neveřejný)." };
}

const packageSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Vyplňte název").max(80),
  description: z.string().trim().max(400).default(""),
  lessonCount: z.coerce.number().int().min(1, "Alespoň 1 lekce").max(100),
  durationMin: z.coerce.number().int().min(15).max(240),
  price: z.coerce.number().min(1, "Cena musí být kladná").max(1_000_000),
  currency: z.enum(["czk", "eur"]),
  validityDays: z.coerce.number().int().min(0).max(730).transform((v) => v || null),
});

export async function savePackage(_: FormState, formData: FormData): Promise<FormState> {
  const { profile } = await requireTutor();
  const parsed = packageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, price, ...rest } = parsed.data;
  const data = { ...rest, priceCents: Math.round(price * 100), isTrial: formData.get("isTrial") === "on" };

  if (id) {
    const res = await db.lessonPackage.updateMany({ where: { id, tutorId: profile.id }, data });
    if (res.count === 0) return { error: "Balíček nenalezen." };
  } else {
    await db.lessonPackage.create({ data: { ...data, tutorId: profile.id } });
  }
  revalidatePath("/dashboard/balicky");
  revalidatePath(`/lektori/${profile.slug}`);
  return { ok: true, message: "Balíček uložen." };
}

export async function togglePackage(formData: FormData) {
  const { profile } = await requireTutor();
  const pkg = await db.lessonPackage.findFirst({ where: { id: String(formData.get("id")), tutorId: profile.id } });
  if (!pkg) return;
  await db.lessonPackage.update({ where: { id: pkg.id }, data: { active: !pkg.active } });
  revalidatePath("/dashboard/balicky");
  revalidatePath(`/lektori/${profile.slug}`);
}

export async function saveAvailability(_: FormState, formData: FormData): Promise<FormState> {
  const { profile } = await requireTutor();
  const weekdays = formData.getAll("weekday").map(Number);
  const starts = formData.getAll("start").map(String);
  const ends = formData.getAll("end").map(String);

  const rows: { weekday: number; startMinute: number; endMinute: number }[] = [];
  for (let i = 0; i < weekdays.length; i++) {
    if (!starts[i] || !ends[i]) continue;
    const startMinute = hhmmToMinutes(starts[i]);
    const endMinute = hhmmToMinutes(ends[i]);
    if (!(weekdays[i] >= 0 && weekdays[i] <= 6)) continue;
    if (endMinute <= startMinute) return { error: "Konec bloku musí být po jeho začátku." };
    rows.push({ weekday: weekdays[i], startMinute, endMinute });
  }

  await db.$transaction([
    db.availability.deleteMany({ where: { tutorId: profile.id } }),
    db.availability.createMany({ data: rows.map((r) => ({ ...r, tutorId: profile.id })) }),
  ]);
  revalidatePath("/dashboard/dostupnost");
  return { ok: true, message: "Dostupnost uložena." };
}

export async function inviteStudent(_: FormState, formData: FormData): Promise<FormState & { link?: string }> {
  const { user, profile } = await requireTutor();
  const email = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (!email.success) return { error: "Zadejte platný e-mail." };
  if (email.data === user.email) return { error: "Nemůžete pozvat sami sebe." };
  const message = String(formData.get("message") ?? "").trim().slice(0, 1000) || null;
  if (!(await rateLimit(`invite:${profile.id}`, 50, 24 * 3600))) return { error: TOO_MANY };

  const capacity = await studentCapacity(profile.id);
  if (capacity.full) {
    return { error: `Máte plnou kapacitu tarifu ${capacity.plan.name} (${capacity.limit} studentů). Přejděte na vyšší tarif, nebo archivujte neaktivní studenty.` };
  }

  const existingStudent = await db.user.findUnique({ where: { email: email.data } });
  if (existingStudent) {
    const enrolled = await db.enrollment.findUnique({
      where: { tutorId_studentId: { tutorId: profile.id, studentId: existingStudent.id } },
    });
    if (enrolled) return { error: "Tento student už u vás je." };
  }

  const token = randomToken(24);
  await db.invitation.create({
    data: { tutorId: profile.id, email: email.data, token, message, expiresAt: addDays(new Date(), 30) },
  });
  const link = absoluteUrl(`/pozvanka/${token}`);
  const { delivered } = await sendMail({
    to: email.data,
    subject: `${user.name} vás zve na ${site.name}`,
    text: `Dobrý den,\n\n${user.name} vás zve do své online výuky na platformě ${site.name}. Zde si můžete kupovat lekce, rezervovat termíny a vidět poznámky z hodin.\n${message ? `\nZpráva od lektora:\n${message}\n` : ""}\nPřijmout pozvánku: ${link}\n`,
  });
  revalidatePath("/dashboard/studenti");
  return {
    ok: true,
    link,
    message: delivered ? `Pozvánka odeslána na ${email.data}.` : "Pozvánka vytvořena. E-mail není nakonfigurován – pošlete studentovi tento odkaz:",
  };
}

export async function revokeInvitation(formData: FormData) {
  const { profile } = await requireTutor();
  await db.invitation.deleteMany({ where: { id: String(formData.get("id")), tutorId: profile.id, acceptedAt: null } });
  revalidatePath("/dashboard/studenti");
}

export async function updateStudentNotes(formData: FormData) {
  const { profile } = await requireTutor();
  await db.enrollment.updateMany({
    where: { id: String(formData.get("enrollmentId")), tutorId: profile.id },
    data: { notes: String(formData.get("notes") ?? "").slice(0, 5000) },
  });
  revalidatePath("/dashboard/studenti", "layout");
}

const lessonSchema = z.object({
  lessonId: z.string(),
  status: z.enum(["SCHEDULED", "COMPLETED", "NO_SHOW"]),
  topic: z.string().trim().max(200),
  notes: z.string().trim().max(5000),
  homework: z.string().trim().max(2000),
});

export async function updateLesson(_: FormState, formData: FormData): Promise<FormState> {
  const { profile } = await requireTutor();
  const parsed = lessonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { lessonId, ...data } = parsed.data;
  const res = await db.lesson.updateMany({ where: { id: lessonId, tutorId: profile.id, status: { not: "CANCELLED" } }, data });
  if (res.count === 0) return { error: "Lekce nenalezena." };
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Uloženo." };
}

export async function cancelLessonByTutor(formData: FormData) {
  const { user, profile } = await requireTutor();
  const lesson = await db.lesson.findFirst({
    where: { id: String(formData.get("lessonId")), tutorId: profile.id, status: "SCHEDULED" },
  });
  if (!lesson) return;
  const series = formData.get("series") === "1" && lesson.seriesId;
  await cancelFutureLessons(series ? { seriesId: lesson.seriesId!, ids: undefined } : { ids: [lesson.id] }, {
    reason: `Lektor ${user.name} zrušil ${series ? "vaše pravidelné lekce" : "lekci"}. Lekce se vám vrátily do balíčku a můžete si vybrat nový termín.`,
  });
  revalidatePath("/dashboard", "layout");
}

export async function rescheduleLessonByTutor(_: FormState, formData: FormData): Promise<FormState> {
  const { user, profile } = await requireTutor();
  const lesson = await db.lesson.findFirst({ where: { id: String(formData.get("lessonId")), tutorId: profile.id, status: "SCHEDULED" } });
  if (!lesson) return { error: "Lekce nenalezena." };
  const local = String(formData.get("start") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return { error: "Zadejte nový datum a čas." };
  const start = fromZonedTime(`${local}:00`, user.timezone);
  try {
    await moveLesson(lesson.id, start, "tutor");
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    throw e;
  }
  await afterLessonMoved(lesson.id, lesson.startsAt, "tutor");
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Lekce přesunuta, student dostal e-mail." };
}

export async function setCalendarSync(formData: FormData) {
  const { user, profile } = await requireTutor();
  const enable = formData.get("enable") === "1";
  if (enable && !(await getCalendarToken(user.id))) redirect("/dashboard/nastaveni?chyba=kalendar");
  await db.tutorProfile.update({ where: { id: profile.id }, data: { calendarSync: enable } });
  revalidatePath("/dashboard/nastaveni");
}

// ---------- Studenti: archiv ----------

export async function setStudentArchived(formData: FormData) {
  const { profile } = await requireTutor();
  const studentId = String(formData.get("studentId"));
  const archive = formData.get("archive") === "1";
  const back = `/dashboard/studenti/${studentId}`;

  if (!archive) {
    // obnovení ze archivu se počítá do tarifu
    const ok = await serializable(async (tx) => {
      const tutor = await tx.tutorProfile.findUniqueOrThrow({ where: { id: profile.id } });
      const plan = effectivePlan(tutor);
      const count = await tx.enrollment.count({ where: { tutorId: profile.id, archivedAt: null } });
      if (plan.maxStudents !== null && count >= plan.maxStudents) return false;
      await tx.enrollment.update({ where: { tutorId_studentId: { tutorId: profile.id, studentId } }, data: { archivedAt: null } });
      return true;
    });
    if (!ok) redirect(`${back}?chyba=kapacita`);
  } else {
    await db.enrollment.update({ where: { tutorId_studentId: { tutorId: profile.id, studentId } }, data: { archivedAt: new Date() } });
  }
  revalidatePath("/dashboard", "layout");
  redirect(back);
}

// ---------- Platby od studentů ----------

export async function startStripeOnboarding() {
  const { user, profile } = await requireTutor();
  if (!stripeEnabled) redirect("/dashboard/platby?chyba=stripe");
  let accountId = profile.stripeAccountId;
  if (!accountId) {
    // Standard účet: lektor má vlastní Stripe, platby jdou přímo jemu a poplatky Stripe platí on.
    const account = await stripe().accounts.create({
      type: "standard",
      country: "CZ",
      email: user.email,
      business_profile: { url: absoluteUrl(`/lektori/${profile.slug}`), product_description: "Online výuka jazyků" },
      metadata: { tutorId: profile.id },
    });
    accountId = account.id;
    await db.tutorProfile.update({ where: { id: profile.id }, data: { stripeAccountId: accountId } });
  }
  const link = await stripe().accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: absoluteUrl("/dashboard/platby"),
    return_url: absoluteUrl("/dashboard/platby?navrat=1"),
  });
  redirect(link.url);
}

export async function saveBankAccount(_: FormState, formData: FormData): Promise<FormState> {
  const { profile } = await requireTutor();
  const raw = String(formData.get("account") ?? "").trim();
  if (!raw) {
    await db.tutorProfile.update({ where: { id: profile.id }, data: { bankIban: null } });
    revalidatePath("/dashboard/platby");
    return { ok: true, message: "Platba převodem je vypnutá." };
  }
  const iban = normalizeAccount(raw);
  if (!iban) return { error: "Neplatné číslo účtu. Zadejte ho ve tvaru 123456789/0800 nebo jako IBAN." };
  await db.tutorProfile.update({ where: { id: profile.id }, data: { bankIban: iban } });
  revalidatePath("/dashboard/platby");
  revalidatePath(`/lektori/${profile.slug}`);
  return { ok: true, message: "Účet uložen. Studenti teď mohou platit převodem s QR kódem." };
}

export async function confirmTransfer(formData: FormData) {
  const { profile } = await requireTutor();
  const purchase = await db.purchase.findFirst({
    where: { id: String(formData.get("purchaseId")), tutorId: profile.id, status: "PENDING", source: "TRANSFER" },
  });
  if (!purchase) return;
  await markPurchasePaid(purchase.id, { notifyTutor: false });
  revalidatePath("/dashboard", "layout");
}

export async function rejectTransfer(formData: FormData) {
  const { profile } = await requireTutor();
  const purchase = await db.purchase.findFirst({
    where: { id: String(formData.get("purchaseId")), tutorId: profile.id, status: "PENDING", source: "TRANSFER" },
    include: { student: true },
  });
  if (!purchase) return;
  await db.purchase.update({ where: { id: purchase.id }, data: { status: "CANCELLED" } });
  await sendMail({
    to: purchase.student.email,
    subject: `Objednávka zrušena: ${purchase.packageName}`,
    text: `Dobrý den,

lektor zrušil vaši objednávku „${purchase.packageName}“ placenou převodem (VS ${purchase.variableSymbol}). Pokud jste už platili, kontaktujte prosím lektora.`,
  });
  revalidatePath("/dashboard/platby");
}

/** Vrácení peněz za nevyčerpané lekce (budoucí naplánované lekce z balíčku se zruší). */
export async function refundPurchase(_: FormState, formData: FormData): Promise<FormState> {
  const { user, profile } = await requireTutor();
  const purchase = await db.purchase.findFirst({
    where: { id: String(formData.get("purchaseId")), tutorId: profile.id, status: "PAID" },
    include: { student: true },
  });
  if (!purchase) return { error: "Nákup nenalezen." };

  await cancelFutureLessons({ purchaseId: purchase.id }, {
    reason: `Lektor ${user.name} vám vrací peníze za nevyčerpané lekce z balíčku „${purchase.packageName}“, naplánované lekce z tohoto balíčku jsme proto zrušili.`,
  });
  const consumed = await db.lesson.count({ where: { purchaseId: purchase.id, status: { in: CONSUMING_STATUSES } } });
  const lessons = purchase.lessonsTotal - purchase.refundedLessons - consumed;
  if (lessons <= 0) return { error: "Z tohoto balíčku nezbývají žádné nevyčerpané lekce." };
  const amount = Math.min(purchase.amountCents - purchase.refundedCents, Math.round((purchase.amountCents * lessons) / purchase.lessonsTotal));

  if (purchase.source === "STRIPE" && amount > 0) {
    if (!purchase.stripePaymentIntentId || !profile.stripeAccountId) return { error: "Platbu nelze dohledat ve Stripe. Vraťte ji prosím přímo ve Stripe." };
    await stripe().refunds.create({ payment_intent: purchase.stripePaymentIntentId, amount }, { stripeAccount: profile.stripeAccountId });
  }
  await db.purchase.update({
    where: { id: purchase.id },
    data: {
      refundedLessons: { increment: lessons },
      refundedCents: { increment: amount },
      refundedAt: new Date(),
      ...(consumed === 0 ? { status: "REFUNDED" } : {}),
    },
  });
  const viaCard = purchase.source === "STRIPE";
  await sendMail({
    to: purchase.student.email,
    subject: `Vrácení peněz: ${purchase.packageName}`,
    text: `Dobrý den,

lektor ${user.name} vám vrací ${formatMoney(amount, purchase.currency)} za ${lessons} nevyčerpaných lekcí z balíčku „${purchase.packageName}“.
${viaCard ? "Peníze se vrátí na kartu, kterou jste platili (obvykle do 5–10 dnů)." : "Peníze vám lektor pošle převodem."}`,
  });
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/studenti/${purchase.studentId}?vraceno=${amount}&mena=${purchase.currency}&karta=${viaCard ? 1 : 0}`);
}

const manualSchema = z.object({
  studentId: z.string(),
  lessonCount: z.coerce.number().int().min(1, "Alespoň 1 lekce").max(100),
  durationMin: z.coerce.number().int().min(15).max(240),
  amount: z.coerce.number().min(0, "Částka nemůže být záporná").max(1_000_000),
  currency: z.enum(["czk", "eur"]),
  note: z.string().trim().min(3, "Uveďte důvod (např. platba v hotovosti, převod předplacených lekcí)").max(300),
});

/** Ruční připsání lekcí (platba mimo platformu, převod předplacených hodin). */
export async function grantManualLessons(_: FormState, formData: FormData): Promise<FormState> {
  const { profile } = await requireTutor();
  const parsed = manualSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const enrollment = await db.enrollment.findUnique({ where: { tutorId_studentId: { tutorId: profile.id, studentId: d.studentId } } });
  if (!enrollment) return { error: "Student nenalezen." };

  await db.purchase.create({
    data: {
      tutorId: profile.id,
      studentId: d.studentId,
      packageName: `Ručně připsáno: ${d.lessonCount}× ${d.durationMin} min`,
      lessonsTotal: d.lessonCount,
      durationMin: d.durationMin,
      amountCents: Math.round(d.amount * 100),
      currency: d.currency,
      status: "PAID",
      source: "MANUAL",
      note: d.note,
      paidAt: new Date(),
    },
  });
  revalidatePath(`/dashboard/studenti/${d.studentId}`);
  revalidatePath("/dashboard/platby");
  return { ok: true, message: `Připsáno ${d.lessonCount} lekcí.` };
}
