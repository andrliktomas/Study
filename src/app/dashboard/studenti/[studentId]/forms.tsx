"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { grantManualLessons, refundPurchase } from "@/app/actions/tutor";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { CURRENCIES } from "@/lib/currencies";

export function ManualGrantForm({ studentId }: { studentId: string }) {
  const [state, action] = useActionState(grantManualLessons, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

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
          <label htmlFor="mg-amount" className="label">Přijatá částka (pro přehled)</label>
          <input id="mg-amount" name="amount" type="number" min={0} step="1" defaultValue={0} required className="input" />
        </div>
        <div>
          <label htmlFor="mg-cur" className="label">Měna</label>
          <select id="mg-cur" name="currency" className="input">{CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code.toUpperCase()}</option>)}</select>
        </div>
      </div>
      <div>
        <label htmlFor="mg-note" className="label">Poznámka</label>
        <input id="mg-note" name="note" required placeholder="např. zaplaceno hotově 3. 11." className="input" />
      </div>
      <SubmitButton className="btn-secondary w-full" pendingText="Připisuji…">Připsat lekce</SubmitButton>
    </form>
  );
}

export function RefundButton({ purchaseId, lessons }: { purchaseId: string; lessons: number }) {
  const [state, action] = useActionState(refundPurchase, null);
  const [confirming, setConfirming] = useState(false);
  if (state?.ok) return <div className="mt-2"><FormMessage state={state} /></div>;
  return (
    <form action={action} className="mt-2">
      <FormMessage state={state} />
      <input type="hidden" name="purchaseId" value={purchaseId} />
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-red-50 p-2 text-xs text-red-800">
          Vrátit peníze za {lessons} nevyčerpané lekce? Naplánované lekce z balíčku se zruší.
          <SubmitButton className="btn-danger px-2 py-1 text-xs" pendingText="Vracím…">Ano, vrátit</SubmitButton>
          <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => setConfirming(false)}>Ne</button>
        </div>
      ) : (
        <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => setConfirming(true)}>
          Vrátit peníze za nevyčerpané lekce ({lessons})
        </button>
      )}
    </form>
  );
}
