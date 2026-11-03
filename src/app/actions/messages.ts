"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/FormMessage";
import { db } from "@/lib/db";
import { ATTACHMENT_MAX_BYTES, detectMime, formatBytes, safeFilename } from "@/lib/files";
import { sendMail } from "@/lib/mail";
import { getConversation } from "@/lib/messages";
import { TOO_MANY, rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/session";
import { absoluteUrl, site } from "@/lib/site";

export async function sendMessage(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const enrollmentId = String(formData.get("enrollmentId"));
  const conv = await getConversation(enrollmentId, user.id);
  if (!conv) return { error: "Konverzace nenalezena." };
  if (!(await rateLimit(`message:${user.id}`, 30, 60))) return { error: TOO_MANY };

  const body = String(formData.get("body") ?? "").trim().slice(0, 4000);
  const file = formData.get("file");
  const hasFile = file instanceof File && file.size > 0;
  if (!body && !hasFile) return { error: "Napište zprávu nebo přiložte soubor." };

  let fileId: string | null = null;
  if (hasFile) {
    if (file.size > ATTACHMENT_MAX_BYTES) return { error: `Soubor je větší než ${formatBytes(ATTACHMENT_MAX_BYTES)}.` };
    const data = Buffer.from(await file.arrayBuffer());
    const bytes = new Uint8Array(data);
    const filename = safeFilename(file.name);
    const mime = detectMime(filename, data, "attachment");
    if (!mime) return { error: "Tento typ souboru nepodporujeme. Pošlete PDF, Word/Excel/PowerPoint, obrázek, MP3/M4A nebo TXT." };
    fileId = (await db.storedFile.create({ data: { ownerId: user.id, kind: "ATTACHMENT", filename, mimeType: mime, size: data.length, data: bytes } })).id;
  }

  // e-mail posíláme jen na první nepřečtenou zprávu – při delší výměně nespamujeme
  const alreadyUnread = await db.message.count({ where: { enrollmentId, senderId: user.id, readAt: null } });
  await db.message.create({ data: { enrollmentId, senderId: user.id, body, fileId } });

  if (alreadyUnread === 0 && !conv.other.deletedAt) {
    const link = conv.isTutor ? `/dashboard/zpravy/${enrollmentId}` : `/dashboard/zpravy/${enrollmentId}`;
    await sendMail({
      to: conv.other.email,
      subject: `Nová zpráva od ${user.name ?? "uživatele"} – ${site.name}`,
      text: `${user.name} vám napsal(a):\n\n${body ? body.slice(0, 500) : "(příloha)"}${hasFile ? `\n\n📎 ${(file as File).name}` : ""}\n\nOdpovědět: ${absoluteUrl(link)}`,
    });
  }
  revalidatePath(`/dashboard/zpravy/${enrollmentId}`);
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
