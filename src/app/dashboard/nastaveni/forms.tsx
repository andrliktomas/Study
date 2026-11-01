"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { removeAvatar, deleteAccount, uploadAvatar } from "@/app/actions/account";
import { changePassword, updateAccount } from "@/app/actions/auth";
import { Avatar } from "@/components/Avatar";
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

/** Fotku zmenšíme a ořízneme na čtverec už v prohlížeči – na server jde malý JPEG. */
async function resizeToSquareJpeg(file: File, size = 400): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", 0.86));
}

export function AvatarForm({ name, image }: { name: string | null; image: string | null }) {
  const { update } = useSession();
  const [preview, setPreview] = useState<string | null>(image);
  const [state, setState] = useState<{ ok?: boolean; error?: string; message?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setState(null);
    try {
      const blob = await resizeToSquareJpeg(file);
      const fd = new FormData();
      fd.append("file", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
      const res = await uploadAvatar(null, fd);
      setState(res);
      if (res?.ok) {
        setPreview(URL.createObjectURL(blob));
        await update();
      }
    } catch {
      setState({ error: "Obrázek se nepodařilo načíst. Zkuste JPG nebo PNG." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-5">
      <Avatar name={name} image={preview} size={88} />
      <div className="space-y-2">
        <FormMessage state={state} />
        <div className="flex flex-wrap gap-2">
          <label className={`btn-primary cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
            {busy ? "Nahrávám…" : preview ? "Změnit fotku" : "Nahrát fotku"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          {preview && (
            <form
              action={async () => {
                await removeAvatar();
                setPreview(null);
                await update();
              }}
            >
              <SubmitButton className="btn-ghost" pendingText="…">Odebrat</SubmitButton>
            </form>
          )}
        </div>
        <p className="hint">JPG, PNG nebo WebP. Fotku automaticky ořízneme na čtverec.</p>
      </div>
    </div>
  );
}

export function DeleteAccountForm({ email, hasPassword }: { email: string; hasPassword: boolean }) {
  const [state, action] = useFormState(deleteAccount, null);
  useEffect(() => {
    if (state?.ok) signOut({ callbackUrl: "/?ucet-smazan=1" });
  }, [state]);
  return (
    <form action={action} className="grid max-w-xl gap-3">
      <FormMessage state={state} />
      <div>
        <label htmlFor="del-confirm" className="label">Pro potvrzení napište svůj e-mail ({email})</label>
        <input id="del-confirm" name="confirm" autoComplete="off" required className="input" />
      </div>
      {hasPassword && (
        <div>
          <label htmlFor="del-pw" className="label">Heslo</label>
          <input id="del-pw" name="password" type="password" autoComplete="current-password" required className="input" />
        </div>
      )}
      <SubmitButton className="btn-danger w-fit" pendingText="Mažu účet…">Trvale smazat účet</SubmitButton>
    </form>
  );
}
