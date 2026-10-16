"use client";
import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { savePackage } from "@/app/actions/tutor";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

type Pkg = { id: string; name: string; description: string; lessonCount: number; durationMin: number; price: number; currency: string; isTrial: boolean };

export function PackageForm({ pkg }: { pkg?: Pkg }) {
  const [state, action] = useFormState(savePackage, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && !pkg) ref.current?.reset();
  }, [state, pkg]);
  const id = pkg?.id ?? "new";

  return (
    <form ref={ref} action={action} className="space-y-4">
      <FormMessage state={state} />
      {pkg && <input type="hidden" name="id" value={pkg.id} />}
      <div>
        <label htmlFor={`name-${id}`} className="label">Název</label>
        <input id={`name-${id}`} name="name" required defaultValue={pkg?.name} placeholder="Balíček 5 lekcí" className="input" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`count-${id}`} className="label">Počet lekcí</label>
          <input id={`count-${id}`} name="lessonCount" type="number" min={1} required defaultValue={pkg?.lessonCount ?? 5} className="input" />
        </div>
        <div>
          <label htmlFor={`dur-${id}`} className="label">Délka (min)</label>
          <select id={`dur-${id}`} name="durationMin" defaultValue={pkg?.durationMin ?? 60} className="input">
            {[25, 30, 45, 50, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_100px] gap-3">
        <div>
          <label htmlFor={`price-${id}`} className="label">Cena celkem</label>
          <input id={`price-${id}`} name="price" type="number" min={1} step="1" required defaultValue={pkg?.price} placeholder="2500" className="input" />
        </div>
        <div>
          <label htmlFor={`cur-${id}`} className="label">Měna</label>
          <select id={`cur-${id}`} name="currency" defaultValue={pkg?.currency ?? "czk"} className="input">
            <option value="czk">CZK</option>
            <option value="eur">EUR</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor={`desc-${id}`} className="label">Popis (nepovinné)</label>
        <textarea id={`desc-${id}`} name="description" rows={2} defaultValue={pkg?.description} className="input" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isTrial" defaultChecked={pkg?.isTrial} className="h-4 w-4 rounded accent-brand-500" />
        Zkušební lekce (student ji může koupit jen jednou)
      </label>
      <SubmitButton className="btn-primary w-full">{pkg ? "Uložit změny" : "Přidat balíček"}</SubmitButton>
    </form>
  );
}
