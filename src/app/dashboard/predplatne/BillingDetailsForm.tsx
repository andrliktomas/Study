"use client";
import { useActionState } from "react";
import { saveBillingDetails } from "@/app/actions/billing";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

type Initial = { legalName: string; street: string; cityName: string; zip: string; country: string; companyId: string; vatId: string; birthDate: string };

export function BillingDetailsForm({ initial }: { initial: Initial }) {
  const [state, action] = useActionState(saveBillingDetails, null);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="b-name" className="label">Jméno a příjmení / název firmy</label>
          <input id="b-name" name="legalName" defaultValue={initial.legalName} required className="input" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="b-street" className="label">Ulice a číslo</label>
          <input id="b-street" name="street" defaultValue={initial.street} required className="input" />
        </div>
        <div>
          <label htmlFor="b-city" className="label">Město</label>
          <input id="b-city" name="cityName" defaultValue={initial.cityName} required className="input" />
        </div>
        <div className="grid grid-cols-[1fr_90px] gap-3">
          <div>
            <label htmlFor="b-zip" className="label">PSČ</label>
            <input id="b-zip" name="zip" defaultValue={initial.zip} required className="input" />
          </div>
          <div>
            <label htmlFor="b-country" className="label">Země</label>
            <select id="b-country" name="country" defaultValue={initial.country} className="input">
              {["CZ", "SK", "AT", "DE", "PL"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="b-ico" className="label">IČO</label>
          <input id="b-ico" name="companyId" defaultValue={initial.companyId} inputMode="numeric" className="input" />
        </div>
        <div>
          <label htmlFor="b-dic" className="label">DIČ (pokud jste plátce DPH)</label>
          <input id="b-dic" name="vatId" defaultValue={initial.vatId} placeholder="CZ12345678" className="input" />
        </div>
        <div>
          <label htmlFor="b-birth" className="label">Datum narození</label>
          <input id="b-birth" name="birthDate" type="date" defaultValue={initial.birthDate} className="input" />
          <p className="hint">Povinné, pokud nemáte IČO (vyžaduje hlášení DAC7).</p>
        </div>
      </div>
      <SubmitButton className="btn-secondary">Uložit údaje</SubmitButton>
    </form>
  );
}
