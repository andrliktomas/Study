"use client";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { register } from "@/app/actions/auth";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

export function RegisterForm({ role, callbackUrl, defaultEmail }: { role: "tutor" | "student"; callbackUrl: string; defaultEmail?: string }) {
  const [state, action] = useFormState(register, null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!state?.ok || !formRef.current) return;
    const fd = new FormData(formRef.current);
    signIn("credentials", { email: fd.get("email"), password: fd.get("password"), redirect: false }).then(() => {
      router.push(callbackUrl);
      router.refresh();
    });
  }, [state, callbackUrl, router]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="role" value={role} />
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
      <SubmitButton className="btn-primary w-full py-3" pendingText="Zakládám účet…">
        {role === "tutor" ? "Založit profil lektora" : "Vytvořit účet"}
      </SubmitButton>
      <p className="text-center text-xs text-ink-faint">Registrací souhlasíte s obchodními podmínkami a zpracováním osobních údajů.</p>
    </form>
  );
}
