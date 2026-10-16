"use client";
import Link from "next/link";
import { useFormState } from "react-dom";
import { resetPassword } from "@/app/actions/auth";
import { AuthCard } from "@/components/AuthCard";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

export default function ResetPasswordPage({ params }: { params: { token: string } }) {
  const [state, action] = useFormState(resetPassword, null);
  return (
    <AuthCard title="Nové heslo">
      {state?.ok ? (
        <div className="space-y-4">
          <FormMessage state={state} />
          <Link href="/prihlaseni" className="btn-primary w-full">Přihlásit se</Link>
        </div>
      ) : (
        <form action={action} className="space-y-4">
          <FormMessage state={state} />
          <input type="hidden" name="token" value={params.token} />
          <div>
            <label htmlFor="password" className="label">Nové heslo</label>
            <input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" className="input" />
          </div>
          <div>
            <label htmlFor="confirm" className="label">Heslo znovu</label>
            <input id="confirm" name="confirm" type="password" minLength={8} required autoComplete="new-password" className="input" />
          </div>
          <SubmitButton className="btn-primary w-full py-3">Nastavit heslo</SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}
