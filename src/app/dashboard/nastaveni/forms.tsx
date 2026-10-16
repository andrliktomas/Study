"use client";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { changePassword, updateAccount } from "@/app/actions/auth";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

const CAL_SCOPES = "openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy";
const TIMEZONES = ["Europe/Prague", "Europe/Bratislava", "Europe/Vienna", "Europe/Berlin", "Europe/London", "Europe/Madrid", "Europe/Warsaw", "America/New_York", "America/Los_Angeles", "Asia/Tokyo"];

export function AccountForm({ name, email, timezone }: { name: string; email: string; timezone: string }) {
  const [state, action] = useFormState(updateAccount, null);
  const { update } = useSession();
  useEffect(() => {
    if (state?.ok) update();
  }, [state, update]);
  const zones = TIMEZONES.includes(timezone) ? TIMEZONES : [timezone, ...TIMEZONES];
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <div>
        <label htmlFor="acc-name" className="label">Jméno</label>
        <input id="acc-name" name="name" defaultValue={name} required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="acc-email">E-mail</label>
        <input id="acc-email" value={email} disabled className="input bg-slate-50 text-ink-faint" />
      </div>
      <div>
        <label htmlFor="acc-tz" className="label">Časové pásmo</label>
        <select id="acc-tz" name="timezone" defaultValue={timezone} className="input">
          {zones.map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
      </div>
      <SubmitButton>Uložit</SubmitButton>
    </form>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action] = useFormState(changePassword, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-4">
      <FormMessage state={state} />
      {hasPassword && (
        <div>
          <label htmlFor="pw-current" className="label">Současné heslo</label>
          <input id="pw-current" name="current" type="password" required autoComplete="current-password" className="input" />
        </div>
      )}
      <div>
        <label htmlFor="pw-new" className="label">Nové heslo</label>
        <input id="pw-new" name="password" type="password" minLength={8} required autoComplete="new-password" className="input" />
      </div>
      <div>
        <label htmlFor="pw-confirm" className="label">Nové heslo znovu</label>
        <input id="pw-confirm" name="confirm" type="password" minLength={8} required autoComplete="new-password" className="input" />
      </div>
      <SubmitButton>{hasPassword ? "Změnit heslo" : "Nastavit heslo"}</SubmitButton>
    </form>
  );
}

export function ConnectCalendarButton({ label = "Připojit Google Kalendář", secondary }: { label?: string; secondary?: boolean }) {
  return (
    <button
      type="button"
      className={secondary ? "btn-ghost" : "btn-primary"}
      onClick={() => signIn("google", { callbackUrl: "/dashboard/nastaveni" }, { scope: CAL_SCOPES, access_type: "offline", prompt: "consent" })}
    >
      {label}
    </button>
  );
}
