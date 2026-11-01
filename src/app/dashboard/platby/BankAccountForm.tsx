"use client";
import { useFormState } from "react-dom";
import { saveBankAccount } from "@/app/actions/tutor";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

export function BankAccountForm({ current }: { current: string }) {
  const [state, action] = useFormState(saveBankAccount, null);
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <div>
        <label htmlFor="account" className="label">Číslo účtu</label>
        <input id="account" name="account" defaultValue={current} placeholder="123456789/0800 nebo CZ65 0800 …" className="input" />
        <p className="hint">Prázdné pole platbu převodem vypne.</p>
      </div>
      <SubmitButton className="btn-secondary">Uložit účet</SubmitButton>
    </form>
  );
}
