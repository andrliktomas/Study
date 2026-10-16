"use client";
import { useState } from "react";
import { useFormState } from "react-dom";
import { submitReview } from "@/app/actions/student";
import { FormMessage } from "./FormMessage";
import { SubmitButton } from "./SubmitButton";

export function ReviewForm({ tutorId, initial }: { tutorId: string; initial?: { rating: number; comment: string } }) {
  const [state, action] = useFormState(submitReview, null);
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const shown = hover || rating;
  const LABELS = ["", "Nespokojen/a", "Nic moc", "Dobré", "Velmi dobré", "Skvělé"];

  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <input type="hidden" name="tutorId" value={tutorId} />
      <input type="hidden" name="rating" value={rating} />
      <div className="flex items-center gap-3" onMouseLeave={() => setHover(0)}>
        <div className="flex" role="radiogroup" aria-label="Počet hvězdiček">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={rating === i}
              aria-label={`${i} z 5`}
              onMouseEnter={() => setHover(i)}
              onClick={() => setRating(i)}
              className="p-0.5 transition hover:scale-125"
            >
              <svg viewBox="0 0 20 20" width={28} height={28} aria-hidden>
                <path fill={i <= shown ? "#f59e0b" : "#e2e8f0"} d="M10 1.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.8l-5.2 2.7 1-5.8L1.6 7.6l5.8-.8z" />
              </svg>
            </button>
          ))}
        </div>
        <span className="text-sm text-ink-soft">{LABELS[shown]}</span>
      </div>
      <textarea name="comment" rows={3} maxLength={1500} defaultValue={initial?.comment} className="input" placeholder="Jak se vám s lektorem učí? (nepovinné)" />
      <SubmitButton className="btn-secondary">{initial ? "Upravit hodnocení" : "Odeslat hodnocení"}</SubmitButton>
    </form>
  );
}
