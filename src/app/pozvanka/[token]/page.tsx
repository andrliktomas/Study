import type { Metadata } from "next";
import Link from "next/link";
import { acceptInvitation } from "@/app/actions/student";
import { AuthCard } from "@/components/AuthCard";
import { Avatar } from "@/components/Avatar";
import { SubmitButton } from "@/components/SubmitButton";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Pozvánka", robots: { index: false } };

export default async function InvitationPage({ params }: { params: { token: string } }) {
  const inv = await db.invitation.findUnique({
    where: { token: params.token },
    include: { tutor: { include: { user: true } } },
  });
  if (!inv || inv.expiresAt < new Date()) {
    return (
      <AuthCard title="Pozvánka neplatí" subtitle="Odkaz vypršel nebo neexistuje. Požádejte lektora o novou pozvánku.">
        <Link href="/" className="btn-secondary w-full">Na úvodní stránku</Link>
      </AuthCard>
    );
  }
  const user = await getCurrentUser();
  const back = `/pozvanka/${params.token}`;

  return (
    <AuthCard title="Pozvánka do výuky">
      <div className="flex items-center gap-4 rounded-xl bg-brand-50 p-4">
        <Avatar name={inv.tutor.user.name} image={inv.tutor.user.image} size={52} />
        <div>
          <p className="font-semibold">{inv.tutor.user.name}</p>
          <p className="text-sm text-ink-soft">{inv.tutor.headline || "vás zve do své online výuky"}</p>
        </div>
      </div>
      {inv.message && <blockquote className="mt-4 border-l-4 border-brand-200 pl-4 text-sm italic text-ink-soft">{inv.message}</blockquote>}
      <div className="mt-6">
        {user ? (
          <form action={acceptInvitation}>
            <input type="hidden" name="token" value={params.token} />
            <p className="mb-3 text-sm text-ink-soft">Přihlášeni jako <strong>{user.email}</strong>.</p>
            <SubmitButton className="btn-primary w-full py-3" pendingText="Přijímám…">Přijmout pozvánku</SubmitButton>
          </form>
        ) : (
          <div className="space-y-3">
            <Link href={`/registrace?callbackUrl=${encodeURIComponent(back)}&email=${encodeURIComponent(inv.email)}`} className="btn-primary w-full py-3">
              Vytvořit účet a přijmout
            </Link>
            <Link href={`/prihlaseni?callbackUrl=${encodeURIComponent(back)}`} className="btn-secondary w-full">Už mám účet</Link>
          </div>
        )}
      </div>
    </AuthCard>
  );
}
