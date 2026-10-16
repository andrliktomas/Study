import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AuthCard, Divider } from "@/components/AuthCard";
import { GoogleButton } from "@/components/GoogleButton";
import { authOptions, googleEnabled } from "@/lib/auth";
import { safeCallbackUrl } from "@/lib/safe-redirect";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = {
  title: "Registrace zdarma",
  description: "Založte si zdarma účet lektora nebo studenta.",
  alternates: { canonical: "/registrace" },
};

export default async function RegisterPage({ searchParams }: { searchParams: { role?: string; callbackUrl?: string; email?: string } }) {
  const role = searchParams.role === "tutor" ? "tutor" : "student";
  const callbackUrl = safeCallbackUrl(searchParams.callbackUrl);
  if (await getServerSession(authOptions)) redirect(callbackUrl);
  // Po registraci přes Google se lektor dostane na dashboard, kde si profil lektora založí jedním klikem.
  const googleCallback = role === "tutor" ? "/dashboard?stat-se-lektorem=1" : callbackUrl;

  return (
    <AuthCard
      title={role === "tutor" ? "Založte si profil lektora" : "Vytvořte si účet"}
      subtitle={<>Už máte účet? <Link href={`/prihlaseni?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-medium text-brand-600 hover:underline">Přihlaste se</Link></>}
    >
      <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-brand-50 p-1 text-sm font-medium" role="tablist">
        {(["student", "tutor"] as const).map((r) => (
          <Link
            key={r}
            role="tab"
            aria-selected={role === r}
            href={{ pathname: "/registrace", query: { role: r, ...(searchParams.callbackUrl ? { callbackUrl } : {}) } }}
            className={`rounded-lg px-3 py-2 text-center transition ${role === r ? "bg-white text-brand-700 shadow-soft" : "text-ink-soft hover:text-brand-700"}`}
          >
            {r === "student" ? "Jsem student" : "Jsem lektor"}
          </Link>
        ))}
      </div>
      {googleEnabled && (
        <>
          <GoogleButton callbackUrl={googleCallback} label="Registrovat přes Google" />
          <Divider />
        </>
      )}
      <RegisterForm role={role} callbackUrl={role === "tutor" ? "/dashboard/profil" : callbackUrl} defaultEmail={searchParams.email} />
    </AuthCard>
  );
}
