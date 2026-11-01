"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { register } from "@/app/actions/auth";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

export function RegisterForm({ role, callbackUrl, defaultEmail }: { role: "tutor" | "student"; callbackUrl: string; defaultEmail?: string }) {
  const [state, action] = useFormState(register, null);
  const [timezone, setTimezone] = useState("Europe/Prague");
  useEffect(() => {
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Prague");
    } catch {
      /* výchozí pásmo */
    }
  }, []);

  if (state?.ok) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-2xl" aria-hidden>✉️</div>
        <h2 className="text-lg font-semibold">Zkontrolujte e-mail</h2>
        <p className="text-sm text-ink-soft">{state.message}</p>
        <p className="text-xs text-ink-faint">E-mail nepřišel? Podívejte se do spamu, nebo si ho nechte poslat znovu na stránce přihlášení.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="timezone" value={timezone} />
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <div>
        <label htmlFor="name" className="label">Jméno a příjmení</label>
        <input id="name" name="name" required autoComplete="name" className="input" />
      </div>
      <div>
        <label htmlFor="email" className="label">E-mail</label>
        <input id="email" name="email" type="email" required autoComplete="email" defaultValue={defaultEmail} className="input" />
      </div>
      <div>
        <label htmlFor="password" className="label">Heslo</label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="input" />
        <p className="hint">Alespoň 8 znaků.</p>
      </div>
      <label className="flex items-start gap-2.5 text-sm text-ink-soft">
        <input type="checkbox" name="terms" required className="mt-0.5 h-4 w-4 shrink-0 rounded accent-brand-500" />
        <span>
          Souhlasím s <Link href="/obchodni-podminky" target="_blank" className="text-brand-600 underline">obchodními podmínkami</Link> a beru na vědomí{" "}
          <Link href="/ochrana-osobnich-udaju" target="_blank" className="text-brand-600 underline">zásady ochrany osobních údajů</Link>.
        </span>
      </label>
      <SubmitButton className="btn-primary w-full py-3" pendingText="Zakládám účet…">
        {role === "tutor" ? "Založit profil lektora" : "Vytvořit účet"}
      </SubmitButton>
    </form>
  );
}
