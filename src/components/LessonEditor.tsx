"use client";
import { useFormState } from "react-dom";
import { updateLesson } from "@/app/actions/tutor";
import { FormMessage } from "./FormMessage";
import { SubmitButton } from "./SubmitButton";

export function LessonEditor({ lesson }: { lesson: { id: string; status: string; topic: string; notes: string; homework: string } }) {
  const [state, action] = useFormState(updateLesson, null);
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <input type="hidden" name="lessonId" value={lesson.id} />
      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <div>
          <label className="label" htmlFor={`topic-${lesson.id}`}>Téma</label>
          <input id={`topic-${lesson.id}`} name="topic" defaultValue={lesson.topic} className="input" placeholder="např. Present perfect" />
        </div>
        <div>
          <label className="label" htmlFor={`status-${lesson.id}`}>Stav</label>
          <select id={`status-${lesson.id}`} name="status" defaultValue={lesson.status} className="input">
            <option value="SCHEDULED">Naplánováno</option>
            <option value="COMPLETED">Proběhla</option>
            <option value="NO_SHOW">Student nepřišel</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor={`notes-${lesson.id}`}>Co jsme probírali (vidí i student)</label>
        <textarea id={`notes-${lesson.id}`} name="notes" rows={3} defaultValue={lesson.notes} className="input" />
      </div>
      <div>
        <label className="label" htmlFor={`hw-${lesson.id}`}>Domácí úkol</label>
        <textarea id={`hw-${lesson.id}`} name="homework" rows={2} defaultValue={lesson.homework} className="input" />
      </div>
      <SubmitButton className="btn-secondary">Uložit záznam</SubmitButton>
    </form>
  );
}
