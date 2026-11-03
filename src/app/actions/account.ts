"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/FormMessage";
import { db } from "@/lib/db";
import { AVATAR_MAX_BYTES, detectMime } from "@/lib/files";
import { cancelFutureLessons } from "@/lib/purchases";
import { TOO_MANY, rateLimit } from "@/lib/rate-limit";
import { redirect } from "next/navigation";
import { clearSessionCookies, requireUser } from "@/lib/session";

export async function uploadAvatar(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!(await rateLimit(`avatar:${user.id}`, 20, 3600))) return { error: TOO_MANY };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Vyberte obrázek." };
  if (file.size > AVATAR_MAX_BYTES) return { error: "Obrázek je příliš velký." };
  const data = Buffer.from(await file.arrayBuffer());
  const mime = detectMime(file.name || "foto.jpg", data, "image");
  if (!mime) return { error: "Podporujeme fotky JPG, PNG nebo WebP." };

  const stored = await db.$transaction(async (tx) => {
    await tx.storedFile.deleteMany({ where: { ownerId: user.id, kind: "AVATAR" } });
    const f = await tx.storedFile.create({ data: { ownerId: user.id, kind: "AVATAR", filename: "avatar", mimeType: mime, size: data.length, data } });
    await tx.user.update({ where: { id: user.id }, data: { image: `/api/soubory/${f.id}` } });
    return f;
  });
  await revalidateProfile(user.id);
  return { ok: true, message: stored ? "Fotka uložena." : "" };
}

export async function removeAvatar() {
  const user = await requireUser();
  await db.$transaction([
    db.storedFile.deleteMany({ where: { ownerId: user.id, kind: "AVATAR" } }),
    db.user.update({ where: { id: user.id }, data: { image: null } }),
  ]);
  await revalidateProfile(user.id);
}

async function revalidateProfile(userId: string) {
  const profile = await db.tutorProfile.findUnique({ where: { userId }, select: { slug: true } });
  revalidatePath("/dashboard", "layout");
  if (profile) {
    revalidatePath(`/lektori/${profile.slug}`);
    revalidatePath("/lektori");
    revalidatePath("/");
  }
}

/**
 * Smazání účtu. Osobní údaje anonymizujeme; záznamy o lekcích a platbách zůstávají lektorům
 * kvůli jejich účetnictví (bez jména a e-mailu). Lektorský profil se smaže celý.
 */
export async function deleteAccount(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (String(formData.get("confirm") ?? "").trim().toLowerCase() !== user.email) {
    return { error: "Pro potvrzení napište přesně svůj e-mail." };
  }
  if (!(await rateLimit(`delete-account:${user.id}`, 5, 3600))) return { error: TOO_MANY };
  if (user.passwordHash) {
    const ok = await bcrypt.compare(String(formData.get("password") ?? ""), user.passwordHash);
    if (!ok) return { error: "Nesprávné heslo." };
  }

  const profile = await db.tutorProfile.findUnique({ where: { userId: user.id } });
  if (profile) {
    // nezaplacené faktury stornujeme; vystavené a zaplacené faktury zůstávají v účetnictví (bez vazby na účet)
    await db.invoice.updateMany({ where: { tutorId: profile.id, status: "ISSUED" }, data: { status: "CANCELLED" } });
    await cancelFutureLessons({ ids: (await db.lesson.findMany({ where: { tutorId: profile.id }, select: { id: true } })).map((l) => l.id) }, {
      reason: "Lektor zrušil svůj účet na platformě, naplánované lekce proto byly zrušeny. Ohledně nevyčerpaných lekcí ho prosím kontaktujte.",
    });
    await db.tutorProfile.delete({ where: { id: profile.id } });
  }

  // budoucí lekce studenta zrušíme (lektor dostane informaci v přehledu)
  const upcoming = await db.lesson.findMany({ where: { studentId: user.id, status: "SCHEDULED", startsAt: { gt: new Date() } }, select: { id: true } });
  await cancelFutureLessons({ ids: upcoming.map((l) => l.id) }, null);

  await db.$transaction([
    db.account.deleteMany({ where: { userId: user.id } }),
    db.session.deleteMany({ where: { userId: user.id } }),
    db.review.deleteMany({ where: { studentId: user.id } }),
    db.storedFile.deleteMany({ where: { ownerId: user.id, kind: "AVATAR" } }),
    db.invitation.deleteMany({ where: { email: user.email } }),
    db.verificationToken.deleteMany({ where: { identifier: user.email } }),
    db.passwordResetToken.deleteMany({ where: { email: user.email } }),
    db.user.update({
      where: { id: user.id },
      data: {
        name: "Smazaný uživatel",
        email: `smazano-${user.id}@deleted.invalid`,
        image: null,
        passwordHash: null,
        emailVerified: null,
        role: "STUDENT",
        deletedAt: new Date(),
        sessionVersion: { increment: 1 },
      },
    }),
  ]);
  revalidatePath("/lektori");
  // odhlásíme rovnou na serveru – po smazání už stránky přehledu uživatele nepustí
  await clearSessionCookies();
  redirect("/?ucet-smazan=1");
}
