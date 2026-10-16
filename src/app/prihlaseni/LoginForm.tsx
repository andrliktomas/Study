"use client";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({ callbackUrl, defaultEmail }: { callbackUrl: string; defaultEmail?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await signIn("credentials", { email: fd.get("email"), password: fd.get("password"), redirect: false });
    setPending(false);
    if (res?.error) return setError("Nesprávný e-mail nebo heslo.");
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div>
        <label htmlFor="email" className="label">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required defaultValue={defaultEmail} className="input" />
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
  );
}
