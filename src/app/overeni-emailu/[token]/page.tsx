import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { verifyEmail } from "@/app/actions/auth";
import { AuthCard } from "@/components/AuthCard";
import { safeCallbackUrl } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Ověření e-mailu", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({ params, searchParams }: { params: { token: string }; searchParams: { callbackUrl?: string } }) {
  const email = await verifyEmail(params.token);
  if (email) {
    const cb = safeCallbackUrl(searchParams.callbackUrl, "/dashboard?ucet-overen=1");
    redirect(`/prihlaseni?overeno=1&email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(cb)}`);
  }
  return (
    <AuthCard title="Odkaz už neplatí" subtitle="Odkaz pro ověření vypršel nebo už byl použit.">
      <p className="text-sm text-ink-soft">Pokud jste e-mail už potvrdili, stačí se přihlásit. Jinak si na stránce přihlášení nechte poslat nový odkaz.</p>
      <Link href="/prihlaseni" className="btn-primary mt-6 w-full">Přihlásit se</Link>
    </AuthCard>
  );
}
