"use client";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFormState } from "react-dom";
import { resendVerification } from "@/app/actions/auth";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

const ERRORS: Record<string, string> = {
  EMAIL_NOT_VERIFIED: "Nejdřív prosím potvrďte svůj e-mail – poslali jsme vám odkaz při registraci.",
  TOO_MANY_ATTEMPTS: "Příliš mnoho pokusů o přihlášení. Zkuste to prosím za 15 minut.",
};

export function LoginForm({ callbackUrl, defaultEmail }: { callbackUrl: string; defaultEmail?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [resendState, resendAction] = useFormState(resendVerification, null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await signIn("credentials", { email: fd.get("email"), password: fd.get("password"), redirect: false });
    setPending(false);
    if (res?.error) return setError(res.error);
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{ERRORS[error] ?? "Nesprávný e-mail nebo heslo."}</p>}
        <div>
          <label htmlFor="email" className="label">E-mail</label>
          <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="label">Heslo</label>
            <Link href="/zapomenute-heslo" className="mb-1.5 text-xs text-brand-600 hover:underline">Zapomenuté heslo?</Link>
          </div>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
        </div>
        <button type="submit" className="btn-primary w-full py-3" disabled={pending}>{pending ? "Přihlašuji…" : "Přihlásit se"}</button>
      </form>
      {error === "EMAIL_NOT_VERIFIED" && (
        <form action={resendAction} className="rounded-xl bg-brand-50 p-4">
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <FormMessage state={resendState} />
          {!resendState?.ok && <SubmitButton className="btn-secondary w-full" pendingText="Odesílám…">Poslat ověřovací e-mail znovu</SubmitButton>}
        </form>
      )}
    </div>
  );
}
