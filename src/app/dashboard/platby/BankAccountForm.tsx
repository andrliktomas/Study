"use client";
import { useActionState, useState } from "react";
import { saveBankAccount } from "@/app/actions/tutor";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

type Initial = { currency: string; holderName: string; account: string; bic: string; bankName: string; note: string };

export function BankAccountForm({ currencies, initial }: { currencies: { code: string; label: string }[]; initial: Initial }) {
  const [state, action] = useActionState(saveBankAccount, null);
  const [currency, setCurrency] = useState(initial.currency);
  const id = initial.account ? `edit-${initial.currency}` : "new";
  const domestic = currency === "czk";

  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`ba-cur-${id}`} className="label">Měna</label>
          <select id={`ba-cur-${id}`} name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className="input" disabled={currencies.length === 1}>
            {currencies.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
          {currencies.length === 1 && <input type="hidden" name="currency" value={currency} />}
        </div>
        <div>
          <label htmlFor={`ba-holder-${id}`} className="label">Majitel účtu</label>
          <input id={`ba-holder-${id}`} name="holderName" defaultValue={initial.holderName} required className="input" />
        </div>
      </div>
      <div>
        <label htmlFor={`ba-account-${id}`} className="label">{domestic ? "Číslo účtu nebo IBAN" : "IBAN (nebo číslo účtu)"}</label>
        <input
          id={`ba-account-${id}`}
          name="account"
          defaultValue={initial.account}
          required
          placeholder={domestic ? "123456789/0800 nebo CZ65 0800 …" : "např. DE89 3704 0044 0532 0130 00"}
          className="input"
        />
        <p className="hint">Pro účty v zemích bez IBAN (např. USA) zadejte číslo účtu a SWIFT, routing number do poznámky.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`ba-bic-${id}`} className="label">SWIFT / BIC {domestic || currency === "eur" ? "(pro platby ze zahraničí)" : ""}</label>
          <input id={`ba-bic-${id}`} name="bic" defaultValue={initial.bic} placeholder="např. GIBACZPX" className="input uppercase" />
        </div>
        <div>
          <label htmlFor={`ba-bank-${id}`} className="label">Název banky (nepovinné)</label>
          <input id={`ba-bank-${id}`} name="bankName" defaultValue={initial.bankName} className="input" />
        </div>
      </div>
      <div>
        <label htmlFor={`ba-note-${id}`} className="label">Poznámka pro plátce (nepovinné)</label>
        <input id={`ba-note-${id}`} name="note" defaultValue={initial.note} placeholder="např. ABA routing 021000021, adresa banky…" className="input" />
      </div>
      <SubmitButton className="btn-secondary">Uložit účet</SubmitButton>
    </form>
  );
}
