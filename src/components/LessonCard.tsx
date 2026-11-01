import type { Lesson, User } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import Link from "next/link";
import { cancelLessonByTutor } from "@/app/actions/tutor";
import { formatDateTime, formatTime } from "@/lib/format";
import { LessonEditor } from "./LessonEditor";
import { LessonStatus } from "./PageHeader";
import { SubmitButton } from "./SubmitButton";
import { TutorRescheduleForm } from "./TutorRescheduleForm";

export function LessonCard({ lesson, tz, hideStudent }: { lesson: Lesson & { student: User }; tz: string; hideStudent?: boolean }) {
  const past = lesson.endsAt < new Date();
  const needsClosing = past && lesson.status === "SCHEDULED";
  const upcoming = lesson.status === "SCHEDULED" && !past;
  return (
    <details className={`card group p-5 ${needsClosing ? "border-amber-200" : ""}`} open={needsClosing}>
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
        <div className="flex-1">
          <p className="font-medium">
            {formatDateTime(lesson.startsAt, tz)}–{formatTime(lesson.endsAt, tz)}
            {!hideStudent && (
              <> · <Link href={`/dashboard/studenti/${lesson.studentId}`} className="text-brand-700 hover:underline">{lesson.student.name ?? lesson.student.email}</Link></>
            )}
          </p>
          {lesson.topic && <p className="text-sm text-ink-soft">{lesson.topic}</p>}
        </div>
        {lesson.seriesId && <span className="badge bg-indigo-50 text-indigo-700" title="Pravidelná lekce">↻ série</span>}
        {needsClosing && <span className="badge bg-amber-100 text-amber-800">Doplňte záznam</span>}
        <LessonStatus status={lesson.status} />
        {lesson.meetLink && upcoming && (
          <a href={lesson.meetLink} target="_blank" rel="noopener noreferrer" className="btn-primary px-3 py-1.5 text-xs">Připojit</a>
        )}
      </summary>
      {lesson.status !== "CANCELLED" && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <LessonEditor lesson={{ id: lesson.id, status: lesson.status, topic: lesson.topic, notes: lesson.notes, homework: lesson.homework }} />
          {upcoming && (
            <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
              <TutorRescheduleForm lessonId={lesson.id} current={formatInTimeZone(lesson.startsAt, tz, "yyyy-MM-dd'T'HH:mm")} />
              <form action={cancelLessonByTutor}>
                <input type="hidden" name="lessonId" value={lesson.id} />
                <SubmitButton className="btn-danger px-3 py-1.5 text-xs" pendingText="Ruším…">Zrušit lekci</SubmitButton>
              </form>
              {lesson.seriesId && (
                <form action={cancelLessonByTutor}>
                  <input type="hidden" name="lessonId" value={lesson.id} />
                  <input type="hidden" name="series" value="1" />
                  <SubmitButton className="btn-danger px-3 py-1.5 text-xs" pendingText="Ruším…">Zrušit celou sérii</SubmitButton>
                </form>
              )}
              <p className="w-full text-xs text-ink-faint">Zrušené lekce se studentovi vrátí do balíčku a dostane e-mail.</p>
            </div>
          )}
        </div>
      )}
    </details>
  );
}
