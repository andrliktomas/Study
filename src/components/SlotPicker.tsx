"use client";
import { useEffect, useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { bookLesson } from "@/app/actions/student";
import { FormMessage } from "./FormMessage";
import { SubmitButton } from "./SubmitButton";

type Slot = { start: string; end: string };

export function SlotPicker({ tutorId, slots, timezone, durationMin }: { tutorId: string; slots: Slot[]; timezone: string; durationMin: number }) {
  const [state, action] = useFormState(bookLesson, null);
  const dayFmt = useMemo(() => new Intl.DateTimeFormat("cs-CZ", { timeZone: timezone, weekday: "short", day: "numeric", month: "numeric" }), [timezone]);
  const keyFmt = useMemo(() => new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }), [timezone]);
  const timeFmt = useMemo(() => new Intl.DateTimeFormat("cs-CZ", { timeZone: timezone, hour: "2-digit", minute: "2-digit" }), [timezone]);

  const days = useMemo(() => {
    const map = new Map<string, { label: string; slots: Slot[] }>();
    for (const s of slots) {
      const d = new Date(s.start);
      const key = keyFmt.format(d);
      if (!map.has(key)) map.set(key, { label: dayFmt.format(d), slots: [] });
      map.get(key)!.slots.push(s);
    }
    return [...map.entries()];
  }, [slots, dayFmt, keyFmt]);

  const [day, setDay] = useState(days[0]?.[0]);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    if (state?.ok) setSelected(null);
  }, [state]);

  if (days.length === 0) {
    return <p className="text-sm text-ink-faint">Lektor momentálně nemá žádné volné termíny. Zkuste to prosím později.</p>;
  }
  const current = days.find(([k]) => k === day)?.[1];

  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="tutorId" value={tutorId} />
      <input type="hidden" name="start" value={selected ?? ""} />
      <div className="flex gap-2 overflow-x-auto pb-1" role="listbox" aria-label="Den">
        {days.map(([k, d]) => (
          <button
            key={k}
            type="button"
            role="option"
            aria-selected={k === day}
            onClick={() => { setDay(k); setSelected(null); }}
            className={`shrink-0 rounded-xl border px-3 py-2 text-sm font-medium transition ${
              k === day ? "border-brand-500 bg-brand-500 text-white shadow-glow" : "border-slate-200 hover:border-brand-300 hover:bg-brand-50"
            }`}
          >
            <span className="capitalize">{d.label}</span>
            <span className={`block text-xs ${k === day ? "text-brand-50" : "text-ink-faint"}`}>{d.slots.length} volných</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" role="listbox" aria-label="Čas">
        {current?.slots.map((s) => (
          <button
            key={s.start}
            type="button"
            role="option"
            aria-selected={selected === s.start}
            onClick={() => setSelected(s.start)}
            className={`rounded-lg border py-2 text-sm font-medium transition ${
              selected === s.start ? "border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-200" : "border-slate-200 hover:-translate-y-0.5 hover:border-brand-300"
            }`}
          >
            {timeFmt.format(new Date(s.start))}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <p className="text-sm text-ink-soft">
          {selected ? <>Vybráno: <strong>{dayFmt.format(new Date(selected))} {timeFmt.format(new Date(selected))}</strong> ({durationMin} min)</> : "Vyberte čas lekce."}
        </p>
        {selected && <SubmitButton pendingText="Rezervuji…">Rezervovat lekci</SubmitButton>}
      </div>
      <p className="text-xs text-ink-faint">Časy jsou v pásmu {timezone}.</p>
    </form>
  );
}
