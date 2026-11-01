import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { participantWhere } from "@/lib/messages";

export async function GET(_: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const file = await db.storedFile.findUnique({ where: { id: params.id }, include: { message: { select: { enrollmentId: true } } } });
  if (!file) return new Response("Nenalezeno", { status: 404 });

  // Profilové fotky jsou veřejné a neměnné (nová fotka = nové ID).
  if (file.kind === "AVATAR") {
    return new Response(file.data, {
      headers: { "Content-Type": file.mimeType, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
    });
  }

  // Přílohy zpráv vidí jen účastníci konverzace.
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId || !file.message) return new Response("Nepřihlášen", { status: 401 });
  const allowed = await db.enrollment.count({ where: { id: file.message.enrollmentId, ...participantWhere(userId) } });
  if (!allowed) return new Response("Zakázáno", { status: 403 });

  const inline = file.mimeType.startsWith("image/") || file.mimeType === "application/pdf";
  return new Response(file.data, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(file.size),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
    },
  });
}
