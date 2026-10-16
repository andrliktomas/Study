"use client";
import { useState } from "react";
import { useFormState } from "react-dom";
import { saveAvailability } from "@/app/actions/tutor";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { minutesToHHMM } from "@/lib/format";

const DAYS = [
  { i: 1, n: "Pondělí" }, { i: 2, n: "Úterý" }, { i: 3, n: "Středa" }, { i: 4, n: "Čtvrtek" },
  { i: 5, n: "Pátek" }, { i: 6, n: "Sobota" }, { i: 0, n: "Neděle" },
];

type Row = { key: number; weekday: number; start: string; end: string };
let nextKey = 1;

export function AvailabilityForm({ initial }: { initial: { weekday: number; start: number; end: number }[] }) {
  const [state, action] = useFormState(saveAvailability, null);
  const [rows, setRows] = useState<Row[]>(() =>
    initial.map((r) => ({ key: nextKey++, weekday: r.weekday, start: minutesToHHMM(r.start), end: minutesToHHMM(r.end) })),
  );

  const add = (weekday: number) => setRows((rs) => [...rs, { key: nextKey++, weekday, start: "16:00", end: "20:00" }]);
  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const remove = (key: number) => setRows((rs) => rs.filter((r) => r.key !== key));
  const copyMonToWeekdays = () => {
    const mon = rows.filter((r) => r.weekday === 1);
    setRows((rs) => [...rs.filter((r) => r.weekday === 1 || r.weekday === 0 || r.weekday === 6), ...[2, 3, 4, 5].flatMap((d) => mon.map((m) => ({ ...m, key: nextKey++, weekday: d })))]);
  };

  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <div className="card divide-y divide-slate-100 p-0">
        {DAYS.map((d) => {
          const dayRows = rows.filter((r) => r.weekday === d.i);
          return (
            <div key={d.i} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
              <div className="flex w-32 items-center gap-2 pt-2">
                <span className={`h-2.5 w-2.5 rounded-full ${dayRows.length ? "bg-brand-500" : "bg-slate-200"}`} />
                <span className="font-medium">{d.n}</span>
              </div>
              <div className="flex-1 space-y-2">
                {dayRows.length === 0 && <p className="pt-2 text-sm text-ink-faint">Neučím</p>}
                {dayRows.map((r) => (
                  <div key={r.key} className="flex items-center gap-2">
                    <input type="hidden" name="weekday" value={r.weekday} />
                    <input type="time" name="start" value={r.start} step={900} onChange={(e) => update(r.key, { start: e.target.value })} className="input w-32" aria-label="Od" />
                    <span className="text-ink-faint">–</span>
                    <input type="time" name="end" value={r.end} step={900} onChange={(e) => update(r.key, { end: e.target.value })} className="input w-32" aria-label="Do" />
                    <button type="button" onClick={() => remove(r.key)} className="btn-ghost px-2 text-red-500" aria-label="Odebrat blok">✕</button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => add(d.i)} className="btn-ghost self-start text-brand-600">+ Přidat blok</button>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap justify-between gap-3">
        <button type="button" onClick={copyMonToWeekdays} className="btn-secondary">Zkopírovat pondělí na út–pá</button>
        <SubmitButton>Uložit dostupnost</SubmitButton>
      </div>
    </form>
  );
}
