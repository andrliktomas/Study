"use client";
import Link from "next/link";
import { useFormState } from "react-dom";
import { requestPasswordReset } from "@/app/actions/auth";
import { AuthCard } from "@/components/AuthCard";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

export default function ForgotPasswordPage() {
  const [state, action] = useFormState(requestPasswordReset, null);
  return (
    <AuthCard title="Zapomenuté heslo" subtitle="Pošleme vám odkaz pro nastavení nového hesla.">
      <form action={action} className="space-y-4">
        <FormMessage state={state} />
        <div>
          <label htmlFor="email" className="label">E-mail</label>
          <input id="email" name="email" type="email" required className="input" />
        </div>
        <SubmitButton className="btn-primary w-full py-3" pendingText="Odesílám…">Poslat odkaz</SubmitButton>
        <p className="text-center text-sm"><Link href="/prihlaseni" className="text-brand-600 hover:underline">Zpět na přihlášení</Link></p>
      </form>
    </AuthCard>
  );
}
