"use server";

import { addMinutes } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/FormMessage";
import { getCreditSummary } from "@/lib/credits";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { createCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar";
import { sendMail } from "@/lib/mail";
import { bookingConfirmationIcs } from "@/lib/reminders";
import { canReview } from "@/lib/reviews";
import { requireUser } from "@/lib/session";
import { absoluteUrl, platformFeePercent, site } from "@/lib/site";
import { getAvailableSlots } from "@/lib/slots";
import { fakePaymentsEnabled, platformFeeCents, stripe, stripeEnabled } from "@/lib/stripe";

async function ensureEnrollment(tutorId: string, studentId: string) {
  await db.enrollment.upsert({
    where: { tutorId_studentId: { tutorId, studentId } },
    create: { tutorId, studentId },
    update: {},
  });
}

export async function startCheckout(formData: FormData) {
  const user = await requireUser();
  const pkg = await db.lessonPackage.findFirst({
    where: { id: String(formData.get("packageId")), active: true },
    include: { tutor: { include: { user: true } } },
  });
  if (!pkg || pkg.tutor.suspended) throw new Error("Balíček nebyl nalezen.");
  if (pkg.tutor.userId === user.id) throw new Error("Nemůžete koupit vlastní balíček.");

  // Zkušební lekci lze koupit u lektora jen jednou.
  if (pkg.isTrial) {
    const had = await db.purchase.count({
      where: { studentId: user.id, tutorId: pkg.tutorId, status: "PAID", package: { isTrial: true } },
    });
    if (had > 0) redirect(`/dashboard/lektor/${pkg.tutorId}?chyba=zkusebni`);
  }

  await ensureEnrollment(pkg.tutorId, user.id);
  const fee = platformFeeCents(pkg.priceCents, platformFeePercent());
  const purchase = await db.purchase.create({
    data: {
      tutorId: pkg.tutorId,
      studentId: user.id,
      packageId: pkg.id,
      packageName: pkg.name,
      lessonsTotal: pkg.lessonCount,
      durationMin: pkg.durationMin,
      amountCents: pkg.priceCents,
      platformFeeCents: fee,
      currency: pkg.currency,
    },
  });
  const back = `/dashboard/lektor/${pkg.tutorId}`;

  if (!stripeEnabled) {
    if (!fakePaymentsEnabled) throw new Error("Platby nejsou nakonfigurovány.");
    await db.purchase.update({ where: { id: purchase.id }, data: { status: "PAID", source: "DEV", paidAt: new Date() } });
    redirect(`${back}?zaplaceno=1`);
  }

  if (!pkg.tutor.stripeAccountId || !pkg.tutor.stripeOnboarded) {
    redirect(`${back}?chyba=platby`);
  }

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: pkg.currency,
          unit_amount: pkg.priceCents,
          product_data: { name: `${pkg.name} – ${pkg.tutor.user.name}`, description: `${pkg.lessonCount}× ${pkg.durationMin} min` },
        },
      },
    ],
    payment_intent_data: {
      application_fee_amount: fee,
      transfer_data: { destination: pkg.tutor.stripeAccountId },
      metadata: { purchaseId: purchase.id },
    },
    metadata: { purchaseId: purchase.id },
    success_url: absoluteUrl(`${back}?zaplaceno=1`),
    cancel_url: absoluteUrl(`${back}?zruseno=1`),
  });
  await db.purchase.update({ where: { id: purchase.id }, data: { stripeSessionId: session.id } });
  redirect(session.url!);
}

export async function bookLesson(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const tutorId = String(formData.get("tutorId"));
  const start = new Date(String(formData.get("start")));
  if (Number.isNaN(start.getTime())) return { error: "Vyberte termín." };

  const enrollment = await db.enrollment.findUnique({ where: { tutorId_studentId: { tutorId, studentId: user.id } } });
  if (!enrollment) return { error: "U tohoto lektora nejste zapsáni." };

  const credits = await getCreditSummary(tutorId, user.id);
  const purchase = credits.purchases.find((p) => p.remaining > 0);
  if (!purchase) return { error: "Nemáte žádné volné lekce. Nejdřív si kupte balíček." };

  const slots = await getAvailableSlots(tutorId, purchase.durationMin);
  if (!slots.some((s) => s.start === start.toISOString())) return { error: "Tento termín už není volný. Vyberte prosím jiný." };

  const end = addMinutes(start, purchase.durationMin);
  const tutor = await db.tutorProfile.findUniqueOrThrow({ where: { id: tutorId }, include: { user: true } });

  const lesson = await db.$transaction(async (tx) => {
    const clash = await tx.lesson.count({
      where: { tutorId, status: "SCHEDULED", startsAt: { lt: end }, endsAt: { gt: start } },
    });
    if (clash > 0) return null;
    return tx.lesson.create({ data: { tutorId, studentId: user.id, purchaseId: purchase.id, startsAt: start, endsAt: end } });
  });
  if (!lesson) return { error: "Tento termín si mezitím rezervoval někdo jiný." };

  let meetLink = tutor.videoLink;
  if (tutor.calendarSync) {
    const ev = await createCalendarEvent(tutor.userId, {
      summary: `Lekce: ${user.name ?? user.email}`,
      description: `Lekce přes ${site.name}.\nStudent: ${user.name} (${user.email})${tutor.videoLink ? `\nOdkaz na hovor: ${tutor.videoLink}` : ""}\n${absoluteUrl("/dashboard")}`,
      start,
      end,
      attendees: [user.email],
      requestId: lesson.id,
    });
    if (ev) {
      meetLink = tutor.videoLink || ev.meetLink;
      await db.lesson.update({ where: { id: lesson.id }, data: { googleEventId: ev.id, meetLink } });
    }
  } else if (meetLink) {
    await db.lesson.update({ where: { id: lesson.id }, data: { meetLink } });
  }

  await sendMail({
    to: user.email,
    subject: `Potvrzení lekce: ${formatDateTime(start, user.timezone)} (lektor: ${tutor.user.name})`,
    text: `Dobrý den,\n\nvaše lekce je rezervována na ${formatDateTime(start, user.timezone)} (${purchase.durationMin} min, lektor: ${tutor.user.name}).${meetLink ? `\nOdkaz na hovor: ${meetLink}` : ""}\n\nZrušit bez ztráty lekce můžete nejpozději ${tutor.cancelHours} h předem:\n${absoluteUrl(`/dashboard/lektor/${tutorId}`)}\n\nV příloze je událost do kalendáře. Den předem vám pošleme připomínku.`,
    attachments: [bookingConfirmationIcs({ id: lesson.id, startsAt: start, endsAt: end, meetLink }, tutor.user.name ?? "lektor")],
  });
  await sendMail({
    to: tutor.user.email,
    subject: `Nová rezervace: ${user.name} – ${formatDateTime(start, tutor.user.timezone)}`,
    text: `${user.name} (${user.email}) si rezervoval(a) lekci na ${formatDateTime(start, tutor.user.timezone)}.\n\n${absoluteUrl("/dashboard/lekce")}`,
  });

  revalidatePath(`/dashboard/lektor/${tutorId}`);
  revalidatePath("/dashboard");
  return { ok: true, message: `Lekce rezervována na ${formatDateTime(start, user.timezone)}.` };
}

export async function cancelLessonByStudent(formData: FormData) {
  const user = await requireUser();
  const lesson = await db.lesson.findFirst({
    where: { id: String(formData.get("lessonId")), studentId: user.id, status: "SCHEDULED" },
    include: { tutor: { include: { user: true } } },
  });
  if (!lesson) return;
  const deadline = lesson.startsAt.getTime() - lesson.tutor.cancelHours * 3600 * 1000;
  if (Date.now() > deadline) redirect(`/dashboard/lektor/${lesson.tutorId}?chyba=storno`);

  await db.lesson.update({ where: { id: lesson.id }, data: { status: "CANCELLED" } });
  if (lesson.googleEventId) await deleteCalendarEvent(lesson.tutor.userId, lesson.googleEventId);
  await sendMail({
    to: lesson.tutor.user.email,
    subject: `Zrušená lekce: ${user.name} – ${formatDateTime(lesson.startsAt, lesson.tutor.user.timezone)}`,
    text: `${user.name} zrušil(a) lekci ${formatDateTime(lesson.startsAt, lesson.tutor.user.timezone)}. Lekce se mu/jí vrátila do balíčku.`,
  });
  revalidatePath(`/dashboard/lektor/${lesson.tutorId}`);
  revalidatePath("/dashboard");
}

export async function acceptInvitation(formData: FormData) {
  const user = await requireUser();
  const inv = await db.invitation.findUnique({ where: { token: String(formData.get("token")) } });
  if (!inv || inv.expiresAt < new Date()) redirect("/dashboard?chyba=pozvanka");
  await ensureEnrollment(inv.tutorId, user.id);
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
