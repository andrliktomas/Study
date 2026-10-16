import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AuthCard, Divider } from "@/components/AuthCard";
import { GoogleButton } from "@/components/GoogleButton";
import { authOptions, googleEnabled } from "@/lib/auth";
import { safeCallbackUrl } from "@/lib/safe-redirect";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Přihlášení", robots: { index: false } };

const ERRORS: Record<string, string> = {
  CredentialsSignin: "Nesprávný e-mail nebo heslo.",
  OAuthAccountNotLinked: "Tento e-mail je už propojený s jiným způsobem přihlášení.",
  default: "Přihlášení se nepodařilo. Zkuste to prosím znovu.",
};

export default async function LoginPage({ searchParams }: { searchParams: { callbackUrl?: string; error?: string } }) {
  const callbackUrl = safeCallbackUrl(searchParams.callbackUrl);
  if (await getServerSession(authOptions)) redirect(callbackUrl);
  const error = searchParams.error ? ERRORS[searchParams.error] ?? ERRORS.default : undefined;

  return (
    <AuthCard
      title="Vítejte zpět"
      subtitle={<>Nemáte účet? <Link href={`/registrace?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-medium text-brand-600 hover:underline">Zaregistrujte se</Link></>}
    >
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {googleEnabled && (
        <>
          <GoogleButton callbackUrl={callbackUrl} />
          <Divider />
        </>
      )}
      <LoginForm callbackUrl={callbackUrl} />
    </AuthCard>
  );
}
