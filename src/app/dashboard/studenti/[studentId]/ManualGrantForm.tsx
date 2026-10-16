"use client";
import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { grantManualLessons } from "@/app/actions/tutor";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

export function ManualGrantForm({ studentId, feePercent }: { studentId: string; feePercent: number }) {
  const [state, action] = useFormState(grantManualLessons, null);
  const [amount, setAmount] = useState("");
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
      setAmount("");
    }
  }, [state]);
  const fee = Math.round((Number(amount) || 0) * feePercent) / 100;

  return (
    <form ref={ref} action={action} className="space-y-3">
      <FormMessage state={state} />
      <input type="hidden" name="studentId" value={studentId} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="mg-count" className="label">Počet lekcí</label>
          <input id="mg-count" name="lessonCount" type="number" min={1} defaultValue={5} required className="input" />
        </div>
        <div>
          <label htmlFor="mg-dur" className="label">Délka</label>
          <select id="mg-dur" name="durationMin" defaultValue={60} className="input">
            {[25, 30, 45, 50, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_90px] gap-3">
        <div>
          <label htmlFor="mg-amount" className="label">Přijatá částka</label>
          <input id="mg-amount" name="amount" type="number" min={0} step="1" required value={amount} onChange={(e) => setAmount(e.target.value)} className="input" />
        </div>
        <div>
          <label htmlFor="mg-cur" className="label">Měna</label>
          <select id="mg-cur" name="currency" className="input"><option value="czk">CZK</option><option value="eur">EUR</option></select>
        </div>
      </div>
      <div>
        <label htmlFor="mg-note" className="label">Důvod</label>
        <input id="mg-note" name="note" required placeholder="např. platba převodem 3. 11." className="input" />
      </div>
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
        Provize platformy {feePercent} % z přijaté částky{fee > 0 && <> (<strong>{fee.toLocaleString("cs-CZ")}</strong>)</>} se eviduje k vyúčtování.
        Převod již dříve zaplacených lekcí uveďte s částkou 0 a důvodem.
      </p>
      <SubmitButton className="btn-secondary w-full" pendingText="Připisuji…">Připsat lekce</SubmitButton>
    </form>
  );
}
