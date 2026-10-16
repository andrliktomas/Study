"use client";
import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { inviteStudent } from "@/app/actions/tutor";
import { CopyButton } from "@/components/CopyButton";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

export function InviteForm() {
  const [state, action] = useFormState(inviteStudent, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-3">
      <FormMessage state={state} />
      {state?.link && (
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg bg-slate-50 px-2 py-1.5 text-xs">{state.link}</code>
          <CopyButton value={state.link} />
        </div>
      )}
      <div>
        <label htmlFor="invite-email" className="label">E-mail studenta</label>
        <input id="invite-email" name="email" type="email" required className="input" />
      </div>
      <div>
        <label htmlFor="invite-msg" className="label">Zpráva (nepovinné)</label>
        <textarea id="invite-msg" name="message" rows={3} className="input" placeholder="Ahoj, převádím naši výuku sem…" />
      </div>
      <SubmitButton className="btn-primary w-full" pendingText="Odesílám…">Poslat pozvánku</SubmitButton>
    </form>
  );
}
