"use server";

import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/FormMessage";
import { db } from "@/lib/db";
import { formatDateTime, hhmmToMinutes, slugify } from "@/lib/format";
import { deleteCalendarEvent, getCalendarToken } from "@/lib/google-calendar";
import { LANGUAGES, LEVELS } from "@/lib/languages";
import { sendMail } from "@/lib/mail";
import { bookingConfirmationIcs } from "@/lib/reminders";
import { requireTutor } from "@/lib/session";
import { absoluteUrl, platformFeePercent, site } from "@/lib/site";
import { platformFeeCents, stripe, stripeEnabled } from "@/lib/stripe";
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
    include: { student: true },
  });
  if (!lesson) return;
  await db.lesson.update({ where: { id: lesson.id }, data: { status: "CANCELLED" } });
  if (lesson.googleEventId) await deleteCalendarEvent(user.id, lesson.googleEventId);
  await sendMail({
    to: lesson.student.email,
    subject: `Lekce ${formatDateTime(lesson.startsAt, lesson.student.timezone)} byla zrušena`,
    text: `Lektor ${user.name} zrušil lekci ${formatDateTime(lesson.startsAt, lesson.student.timezone)}. Lekce se vám vrátila do balíčku a můžete si vybrat nový termín:\n${absoluteUrl(`/dashboard/lektor/${profile.id}`)}`,
    attachments: [bookingConfirmationIcs(lesson, user.name ?? "lektor", true)],
  });
  revalidatePath("/dashboard", "layout");
}

export async function setCalendarSync(formData: FormData) {
  const { user, profile } = await requireTutor();
  const enable = formData.get("enable") === "1";
  if (enable && !(await getCalendarToken(user.id))) redirect("/dashboard/nastaveni?chyba=kalendar");
  await db.tutorProfile.update({ where: { id: profile.id }, data: { calendarSync: enable } });
  revalidatePath("/dashboard/nastaveni");
}

export async function startStripeOnboarding() {
  const { user, profile } = await requireTutor();
  if (!stripeEnabled) redirect("/dashboard/vyplaty?chyba=stripe");
  let accountId = profile.stripeAccountId;
  if (!accountId) {
    const account = await stripe().accounts.create({
      type: "express",
      country: "CZ",
      email: user.email,
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      business_profile: { url: absoluteUrl(`/lektori/${profile.slug}`), product_description: "Online výuka jazyků" },
      metadata: { tutorId: profile.id },
    });
    accountId = account.id;
    await db.tutorProfile.update({ where: { id: profile.id }, data: { stripeAccountId: accountId } });
  }
  const link = await stripe().accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: absoluteUrl("/dashboard/vyplaty"),
    return_url: absoluteUrl("/dashboard/vyplaty?navrat=1"),
  });
  redirect(link.url);
}

export async function openStripeDashboard() {
  const { profile } = await requireTutor();
  if (!profile.stripeAccountId) redirect("/dashboard/vyplaty");
  const link = await stripe().accounts.createLoginLink(profile.stripeAccountId);
  redirect(link.url);
}

const manualSchema = z.object({
  studentId: z.string(),
  lessonCount: z.coerce.number().int().min(1, "Alespoň 1 lekce").max(100),
  durationMin: z.coerce.number().int().min(15).max(240),
  amount: z.coerce.number().min(0, "Částka nemůže být záporná").max(1_000_000),
  currency: z.enum(["czk", "eur"]),
  note: z.string().trim().min(3, "Uveďte důvod (např. platba převodem, převod předplacených lekcí)").max(300),
});

/**
 * Ruční připsání lekcí (platba mimo platformu, převod předplacených hodin).
 * Provize z uvedené částky se eviduje jako dlužná a provozovatel ji lektorovi vyúčtuje.
 */
export async function grantManualLessons(_: FormState, formData: FormData): Promise<FormState> {
  const { profile } = await requireTutor();
  const parsed = manualSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const enrollment = await db.enrollment.findUnique({ where: { tutorId_studentId: { tutorId: profile.id, studentId: d.studentId } } });
  if (!enrollment) return { error: "Student nenalezen." };

  const amountCents = Math.round(d.amount * 100);
  const fee = platformFeeCents(amountCents, platformFeePercent());
  await db.purchase.create({
    data: {
      tutorId: profile.id,
      studentId: d.studentId,
      packageName: `Ručně připsáno: ${d.lessonCount}× ${d.durationMin} min`,
      lessonsTotal: d.lessonCount,
      durationMin: d.durationMin,
      amountCents,
      platformFeeCents: fee,
      currency: d.currency,
      status: "PAID",
      source: "MANUAL",
      note: d.note,
      paidAt: new Date(),
      feeSettledAt: fee === 0 ? new Date() : null,
    },
  });
  revalidatePath(`/dashboard/studenti/${d.studentId}`);
  revalidatePath("/dashboard/vyplaty");
  return {
    ok: true,
    message: fee > 0 ? `Připsáno ${d.lessonCount} lekcí. Provize ${(fee / 100).toFixed(0)} ${d.currency.toUpperCase()} vám bude vyúčtována.` : `Připsáno ${d.lessonCount} lekcí.`,
  };
}
