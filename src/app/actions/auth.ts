"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/FormMessage";
import { db } from "@/lib/db";
import { slugify } from "@/lib/format";
import { sendMail } from "@/lib/mail";
import { requireUser } from "@/lib/session";
import { absoluteUrl, site } from "@/lib/site";
import { hashToken, randomToken } from "@/lib/tokens";

const password = z.string().min(8, "Heslo musí mít alespoň 8 znaků").max(200);

export async function uniqueTutorSlug(name: string) {
  const base = slugify(name) || "lektor";
  let slug = base;
  for (let i = 2; await db.tutorProfile.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
  return slug;
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Vyplňte jméno").max(80),
  email: z.string().trim().toLowerCase().email("Neplatný e-mail"),
  password,
  role: z.enum(["tutor", "student"]),
  terms: z.literal("on", { errorMap: () => ({ message: "Pro registraci je nutný souhlas s obchodními podmínkami." }) }),
});

export async function register(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, role } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "Účet s tímto e-mailem už existuje. Přihlaste se, případně si obnovte heslo." };

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      termsAcceptedAt: new Date(),
      role: role === "tutor" ? "TUTOR" : "STUDENT",
      ...(role === "tutor" ? { tutorProfile: { create: { slug: await uniqueTutorSlug(name) } } } : {}),
    },
  });
  return { ok: true };
}

/** Student (nebo uživatel přihlášený přes Google) si může kdykoli založit i profil lektora. */
export async function becomeTutor() {
  const user = await requireUser();
  const existing = await db.tutorProfile.findUnique({ where: { userId: user.id } });
  if (!existing) {
    await db.tutorProfile.create({ data: { userId: user.id, slug: await uniqueTutorSlug(user.name ?? user.email.split("@")[0]) } });
  }
  await db.user.update({ where: { id: user.id }, data: { role: "TUTOR" } });
  revalidatePath("/dashboard");
}

export async function requestPasswordReset(_: FormState, formData: FormData): Promise<FormState> {
  const email = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (!email.success) return { error: "Zadejte platný e-mail." };
  const generic = { message: "Pokud účet s tímto e-mailem existuje, poslali jsme na něj odkaz pro nastavení nového hesla." };

  const user = await db.user.findUnique({ where: { email: email.data } });
  if (!user) return generic;

  const token = randomToken();
  await db.passwordResetToken.create({
    data: { email: user.email, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  });
  const link = absoluteUrl(`/reset-hesla/${token}`);
  await sendMail({
    to: user.email,
    subject: `${site.name}: nastavení nového hesla`,
    text: `Dobrý den,\n\npro nastavení nového hesla klikněte na odkaz (platí 1 hodinu):\n${link}\n\nPokud jste o změnu nežádali, e-mail ignorujte.`,
  });
  return generic;
}

export async function resetPassword(_: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const pw = password.safeParse(formData.get("password"));
  if (!pw.success) return { error: pw.error.issues[0].message };
  if (formData.get("password") !== formData.get("confirm")) return { error: "Hesla se neshodují." };

  const record = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) return { error: "Odkaz je neplatný nebo vypršel. Požádejte o nový." };

  await db.$transaction([
    db.user.update({ where: { email: record.email }, data: { passwordHash: await bcrypt.hash(pw.data, 12) } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
  return { ok: true, message: "Heslo bylo změněno. Nyní se můžete přihlásit." };
}

export async function changePassword(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const next = password.safeParse(formData.get("password"));
  if (!next.success) return { error: next.error.issues[0].message };
  if (formData.get("password") !== formData.get("confirm")) return { error: "Hesla se neshodují." };

  if (user.passwordHash) {
    const ok = await bcrypt.compare(String(formData.get("current") ?? ""), user.passwordHash);
    if (!ok) return { error: "Současné heslo není správné." };
  }
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next.data, 12) } });
  return { ok: true, message: user.passwordHash ? "Heslo bylo změněno." : "Heslo bylo nastaveno. Nyní se můžete přihlašovat i e-mailem." };
}

const accountSchema = z.object({
  name: z.string().trim().min(2, "Vyplňte jméno").max(80),
  timezone: z.string().refine((tz) => {
    try {
      new Intl.DateTimeFormat("cs", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "Neplatné časové pásmo"),
});

export async function updateAccount(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = accountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await db.user.update({ where: { id: user.id }, data: parsed.data });
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Uloženo." };
}
