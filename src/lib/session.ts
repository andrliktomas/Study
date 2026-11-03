import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";
import { db } from "./db";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  // smazaný účet nebo přihlášení starší než poslední změna hesla
  if (!user || user.deletedAt || user.sessionVersion !== (session.user.sessionVersion ?? 0)) return null;
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/prihlaseni");
  return user;
}

export async function requireTutor() {
  const user = await requireUser();
  const profile = await db.tutorProfile.findUnique({ where: { userId: user.id } });
  if (!profile) redirect("/dashboard");
  return { user, profile };
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

/** Odhlásí aktuální prohlížeč (smaže cookie relace NextAuth) – pro server actions. */
export async function clearSessionCookies() {
  const jar = await cookies();
  for (const c of jar.getAll()) {
    if (/^(__Secure-)?next-auth\.session-token(\.\d+)?$/.test(c.name)) jar.delete(c.name);
  }
}
