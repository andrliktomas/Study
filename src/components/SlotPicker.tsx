"use client";
import { useEffect, useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { bookLesson, rescheduleLessonByStudent } from "@/app/actions/student";
import { pluralLessons } from "@/lib/format";
import { FormMessage } from "./FormMessage";
import { SubmitButton } from "./SubmitButton";

type Slot = { start: string; end: string };

type Props = { tutorId: string; slots: Slot[]; timezone: string; durationMin: number } & (
  | { mode: "book"; maxRepeat?: number }
  | { mode: "reschedule"; lessonId: string }
);

export function SlotPicker(props: Props) {
  const { tutorId, slots, timezone, durationMin } = props;
  const [state, action] = useFormState(props.mode === "book" ? bookLesson : rescheduleLessonByStudent, null);
  const dayFmt = useMemo(() => new Intl.DateTimeFormat("cs-CZ", { timeZone: timezone, weekday: "short", day: "numeric", month: "numeric" }), [timezone]);
  const keyFmt = useMemo(() => new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }), [timezone]);
  const timeFmt = useMemo(() => new Intl.DateTimeFormat("cs-CZ", { timeZone: timezone, hour: "2-digit", minute: "2-digit" }), [timezone]);
  const weekdayFmt = useMemo(() => new Intl.DateTimeFormat("cs-CZ", { timeZone: timezone, weekday: "long" }), [timezone]);

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
  const [repeat, setRepeat] = useState(1);
  const maxRepeat = props.mode === "book" ? props.maxRepeat ?? 1 : 1;
  useEffect(() => {
    if (state?.ok) {
      setSelected(null);
      setRepeat(1);
    }
  }, [state]);

  if (days.length === 0) {
    return <p className="text-sm text-ink-faint">Lektor momentálně nemá žádné volné termíny. Zkuste to prosím později nebo mu napište.</p>;
  }
  const current = days.find(([k]) => k === day)?.[1];

  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="tutorId" value={tutorId} />
      <input type="hidden" name="start" value={selected ?? ""} />
      {props.mode === "reschedule" && <input type="hidden" name="lessonId" value={props.lessonId} />}
      <div className="flex gap-2 overflow-x-auto pb-1" role="listbox" aria-label="Den">
        {days.map(([k, d]) => (
          <button
            key={k}
            type="button"
            role="option"
            aria-selected={k === day}
            onClick={() => {
              setDay(k);
              setSelected(null);
            }}
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

      {props.mode === "book" && maxRepeat > 1 && selected && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-indigo-50/70 px-4 py-3 text-sm">
          <label className="flex items-center gap-2 font-medium">
            <input type="checkbox" checked={repeat > 1} onChange={(e) => setRepeat(e.target.checked ? Math.min(4, maxRepeat) : 1)} className="h-4 w-4 accent-brand-500" />
            Opakovat každý týden
          </label>
          {repeat > 1 && (
            <label className="flex items-center gap-2">
              <span className="text-ink-soft">{weekdayFmt.format(new Date(selected))} {timeFmt.format(new Date(selected))},</span>
              <select value={repeat} onChange={(e) => setRepeat(Number(e.target.value))} className="input w-auto py-1" aria-label="Počet týdnů">
                {Array.from({ length: maxRepeat - 1 }, (_, i) => i + 2).map((n) => <option key={n} value={n}>{n}× (celkem)</option>)}
              </select>
            </label>
          )}
        </div>
      )}
      <input type="hidden" name="repeat" value={repeat} />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <p className="text-sm text-ink-soft">
          {selected ? (
            <>
              {props.mode === "reschedule" ? "Nový termín" : "Vybráno"}: <strong>{dayFmt.format(new Date(selected))} {timeFmt.format(new Date(selected))}</strong> ({durationMin} min)
              {repeat > 1 && <> · {repeat} týdnů po sobě</>}
            </>
          ) : (
            "Vyberte čas lekce."
          )}
        </p>
        {selected && (
          <SubmitButton pendingText={props.mode === "reschedule" ? "Přesouvám…" : "Rezervuji…"}>
            {props.mode === "reschedule" ? "Přesunout lekci" : repeat > 1 ? `Rezervovat ${repeat} ${pluralLessons(repeat)}` : "Rezervovat lekci"}
          </SubmitButton>
        )}
      </div>
      <p className="text-xs text-ink-faint">Časy jsou v pásmu {timezone}.</p>
    </form>
  );
}
