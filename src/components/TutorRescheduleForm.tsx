"use client";
import { useFormState } from "react-dom";
import { rescheduleLessonByTutor } from "@/app/actions/tutor";
import { FormMessage } from "./FormMessage";
import { SubmitButton } from "./SubmitButton";

export function TutorRescheduleForm({ lessonId, current }: { lessonId: string; current: string }) {
  const [state, action] = useFormState(rescheduleLessonByTutor, null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="lessonId" value={lessonId} />
      <div>
        <label htmlFor={`move-${lessonId}`} className="label text-xs">Přesunout na</label>
        <input id={`move-${lessonId}`} type="datetime-local" name="start" defaultValue={current} step={900} required className="input py-1.5" />
      </div>
      <SubmitButton className="btn-secondary px-3 py-1.5 text-xs" pendingText="Přesouvám…">Přesunout</SubmitButton>
      <div className="w-full"><FormMessage state={state} /></div>
    </form>
  );
}
