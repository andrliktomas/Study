"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/FormMessage";
import { BookingError, bookLessons, moveLesson, serializable } from "@/lib/booking";
import { db } from "@/lib/db";
import { formatDateTime, formatMoney, pluralLessons } from "@/lib/format";
import { afterLessonMoved, afterLessonsBooked } from "@/lib/lesson-notify";
import { sendMail } from "@/lib/mail";
import { effectivePlan } from "@/lib/plans";
import { cancelFutureLessons, newVariableSymbol } from "@/lib/purchases";
import { canReview } from "@/lib/reviews";
import { requireUser } from "@/lib/session";
import { absoluteUrl } from "@/lib/site";
import { weeklyStarts } from "@/lib/slots";
import { accountFor, paymentReference } from "@/lib/payments";

/**
 * Zapíše studenta k lektorovi. Noví studenti se počítají do tarifu lektora –
 * když je kapacita plná, vrátí "kapacita". Archivovaný student vrátí "archiv".
 */
async function ensureEnrollment(tutorId: string, studentId: string): Promise<"ok" | "kapacita" | "archiv"> {
  return serializable(async (tx) => {
    const existing = await tx.enrollment.findUnique({ where: { tutorId_studentId: { tutorId, studentId } } });
    if (existing) return existing.archivedAt ? "archiv" : "ok";
    const tutor = await tx.tutorProfile.findUniqueOrThrow({ where: { id: tutorId }, select: { plan: true, planActiveUntil: true } });
    const plan = effectivePlan(tutor);
    if (plan.maxStudents !== null) {
      const count = await tx.enrollment.count({ where: { tutorId, archivedAt: null } });
      if (count >= plan.maxStudents) return "kapacita";
    }
    await tx.enrollment.create({ data: { tutorId, studentId } });
    return "ok";
  });
}

async function preparePurchase(formData: FormData) {
  const user = await requireUser();
  const pkg = await db.lessonPackage.findFirst({
    where: { id: String(formData.get("packageId")), active: true, tutor: { suspended: false } },
    include: { tutor: { include: { user: true, bankAccounts: true } } },
  });
  if (!pkg) redirect("/lektori?chyba=balicek");
  const back = `/dashboard/lektor/${pkg.tutorId}`;
  if (pkg.tutor.userId === user.id) redirect(`/lektori/${pkg.tutor.slug}?chyba=vlastni`);

  if (pkg.isTrial) {
    // zkušební lekce jen jednou: zaplacená, nebo rozjednaná platba převodem
    const trials = await db.purchase.count({
      where: {
        studentId: user.id,
        tutorId: pkg.tutorId,
        package: { isTrial: true },
        OR: [{ status: "PAID" }, { status: "PENDING", source: "TRANSFER" }],
      },
    });
    if (trials > 0) redirect(`${back}?chyba=zkusebni`);
  }

  const enrolled = await ensureEnrollment(pkg.tutorId, user.id);
  if (enrolled !== "ok") redirect(`/lektori/${pkg.tutor.slug}?chyba=${enrolled}`);
  return { user, pkg, back };
}

function purchaseData(pkg: { id: string; tutorId: string; name: string; lessonCount: number; durationMin: number; priceCents: number; currency: string }, studentId: string) {
  return {
    tutorId: pkg.tutorId,
    studentId,
    packageId: pkg.id,
    packageName: pkg.name,
    lessonsTotal: pkg.lessonCount,
    durationMin: pkg.durationMin,
    amountCents: pkg.priceCents,
    currency: pkg.currency,
  };
}

/** Platba převodem (i ze zahraničí) – student dostane platební údaje a QR kód, lektor připsání potvrdí. */
export async function startTransfer(formData: FormData) {
  const { user, pkg, back } = await preparePurchase(formData);
  const account = accountFor(pkg.tutor.bankAccounts, pkg.currency);
  if (!account) redirect(`${back}?chyba=prevod`);

  const purchase = await db.purchase.create({
    data: { ...purchaseData(pkg, user.id), source: "TRANSFER", variableSymbol: await newVariableSymbol() },
  });
  const ref = paymentReference(purchase.variableSymbol!);
  await sendMail({
    to: pkg.tutor.user.email,
    subject: `Čeká na platbu převodem: ${user.name} – ${pkg.name}`,
    text: `${user.name} (${user.email}) si objednal(a) „${pkg.name}“ za ${formatMoney(pkg.priceCents, pkg.currency)} a zaplatí převodem (VS ${purchase.variableSymbol}, reference ${ref}).\n\nAž peníze dorazí, potvrďte platbu:\n${absoluteUrl("/dashboard/platby")}`,
  });
  await sendMail({
    to: user.email,
    subject: `Platební údaje: ${pkg.name} (${formatMoney(pkg.priceCents, pkg.currency)})`,
    text: `Dobrý den,\n\nděkujeme za objednávku „${pkg.name}“ u lektora ${pkg.tutor.user.name}.\n\nČástka: ${formatMoney(pkg.priceCents, pkg.currency)}\nMajitel účtu: ${account.holderName}\n${account.iban ? `IBAN: ${account.iban}\n` : ""}${account.accountNumber ? `Číslo účtu: ${account.accountNumber}\n` : ""}${account.bic ? `SWIFT/BIC: ${account.bic}\n` : ""}Variabilní symbol: ${purchase.variableSymbol}\nReference / zpráva: ${ref}\n\nQR kód a všechny údaje najdete zde:\n${absoluteUrl(`${back}/platba/${purchase.id}`)}\n\nLekce se připíšou, jakmile lektor platbu potvrdí.`,
  });
  redirect(`${back}/platba/${purchase.id}`);
}

export async function cancelPendingPurchase(formData: FormData) {
  const user = await requireUser();
  const p = await db.purchase.findFirst({ where: { id: String(formData.get("purchaseId")), studentId: user.id, status: "PENDING" } });
  if (!p) return;
  await db.purchase.update({ where: { id: p.id }, data: { status: "CANCELLED" } });
  redirect(`/dashboard/lektor/${p.tutorId}`);
}

export async function bookLesson(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const tutorId = String(formData.get("tutorId"));
  const start = new Date(String(formData.get("start")));
  if (Number.isNaN(start.getTime())) return { error: "Vyberte termín." };
  const repeat = Math.min(12, Math.max(1, Number(formData.get("repeat")) || 1));

  const tutor = await db.tutorProfile.findUnique({ where: { id: tutorId }, include: { user: true } });
  if (!tutor || tutor.suspended) return { error: "Lektor nenalezen." };

  try {
    const starts = repeat > 1 ? weeklyStarts(start, repeat, tutor.user.timezone) : [start];
    const result = await bookLessons(tutorId, user.id, starts);
    await afterLessonsBooked(result.created, tutor, user);
    revalidatePath(`/dashboard/lektor/${tutorId}`);
    revalidatePath("/dashboard");

    const skipped = [...result.conflicts, ...result.clashed, ...result.noCredit];
    const booked = result.created.map((l) => formatDateTime(l.startsAt, user.timezone));
    return {
      ok: true,
      message:
        booked.length === 1
          ? `Lekce rezervována na ${booked[0]}.`
          : `Rezervováno: ${booked.length} ${pluralLessons(booked.length)} (${booked[0]} – ${booked[booked.length - 1]}).` +
            (skipped.length ? ` Tyto termíny nebyly volné nebo na ně nezbyly lekce: ${skipped.map((d) => formatDateTime(d, user.timezone)).join(", ")}.` : ""),
    };
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    throw e;
  }
}

export async function rescheduleLessonByStudent(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const lesson = await db.lesson.findFirst({
    where: { id: String(formData.get("lessonId")), studentId: user.id, status: "SCHEDULED" },
    include: { tutor: true },
  });
  if (!lesson) return { error: "Lekce nenalezena." };
  if (lesson.startsAt.getTime() - Date.now() < lesson.tutor.cancelHours * 3600 * 1000) {
    return { error: `Lekci lze přesunout nejpozději ${lesson.tutor.cancelHours} h předem. Kontaktujte prosím lektora.` };
  }
  const start = new Date(String(formData.get("start")));
  if (Number.isNaN(start.getTime())) return { error: "Vyberte nový termín." };
  try {
    await moveLesson(lesson.id, start, "student");
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    throw e;
  }
  await afterLessonMoved(lesson.id, lesson.startsAt, "student");
  revalidatePath(`/dashboard/lektor/${lesson.tutorId}`);
  redirect(`/dashboard/lektor/${lesson.tutorId}?presunuto=1`);
}

export async function cancelLessonByStudent(formData: FormData) {
  const user = await requireUser();
  const lesson = await db.lesson.findFirst({
    where: { id: String(formData.get("lessonId")), studentId: user.id, status: "SCHEDULED" },
    include: { tutor: { include: { user: true } } },
  });
  if (!lesson) return;
  const deadlineMs = lesson.tutor.cancelHours * 3600 * 1000;
  if (lesson.startsAt.getTime() - Date.now() < deadlineMs) redirect(`/dashboard/lektor/${lesson.tutorId}?chyba=storno`);

  // celá série = tato a všechny další lekce série, které jsou ještě ve lhůtě pro storno
  const ids =
    formData.get("series") === "1" && lesson.seriesId
      ? (
          await db.lesson.findMany({
            where: { seriesId: lesson.seriesId, status: "SCHEDULED", startsAt: { gte: lesson.startsAt, gt: new Date(Date.now() + deadlineMs) } },
            select: { id: true },
          })
        ).map((l) => l.id)
      : [lesson.id];
  const cancelled = await cancelFutureLessons({ ids }, null);

  const tz = lesson.tutor.user.timezone;
  await sendMail({
    to: lesson.tutor.user.email,
    subject: `Zrušené lekce: ${user.name} (${cancelled.length}×)`,
    text: `${user.name} zrušil(a) lekce:\n${cancelled.map((l) => `• ${formatDateTime(l.startsAt, tz)}`).join("\n")}\n\nLekce se mu/jí vrátily do balíčku.`,
  });
  revalidatePath(`/dashboard/lektor/${lesson.tutorId}`);
  revalidatePath("/dashboard");
}

export async function acceptInvitation(formData: FormData) {
  const user = await requireUser();
  const inv = await db.invitation.findUnique({ where: { token: String(formData.get("token")) } });
  if (!inv || inv.expiresAt < new Date()) redirect("/dashboard?chyba=pozvanka");
  const res = await ensureEnrollment(inv.tutorId, user.id);
  if (res === "kapacita") redirect(`/pozvanka/${inv.token}?chyba=kapacita`);
  if (res === "archiv") {
    await db.enrollment.update({ where: { tutorId_studentId: { tutorId: inv.tutorId, studentId: user.id } }, data: { archivedAt: null } });
  }
  if (!inv.acceptedAt) await db.invitation.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } });
  redirect(`/dashboard/lektor/${inv.tutorId}?vitejte=1`);
}

export async function submitReview(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const tutorId = String(formData.get("tutorId"));
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 1500);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Vyberte počet hvězdiček." };
  if (!(await canReview(tutorId, user.id))) return { error: "Hodnotit můžete až po první absolvované lekci." };

  const tutor = await db.tutorProfile.update({
    where: { id: tutorId },
    data: {
      reviews: {
        upsert: {
          where: { tutorId_studentId: { tutorId, studentId: user.id } },
          create: { studentId: user.id, rating, comment },
          update: { rating, comment },
        },
      },
    },
  });
  revalidatePath(`/lektori/${tutor.slug}`);
  revalidatePath(`/dashboard/lektor/${tutorId}`);
  return { ok: true, message: "Děkujeme za hodnocení!" };
}
