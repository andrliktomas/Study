"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { sendMessage } from "@/app/actions/messages";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { ATTACHMENT_ACCEPT } from "@/lib/files";

export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  useEffect(() => {
    window.scrollTo({ top: document.body.scrollHeight });
  }, []);
  return null;
}

export function Composer({ enrollmentId }: { enrollmentId: string }) {
  const [state, action] = useFormState(sendMessage, null);
  const ref = useRef<HTMLFormElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
      setFileName(null);
    }
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-2">
      {state?.error && <FormMessage state={state} />}
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <textarea
        name="body"
        rows={2}
        maxLength={4000}
        placeholder="Napište zprávu…"
        className="input resize-y"
        aria-label="Zpráva"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) ref.current?.requestSubmit();
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="btn-ghost cursor-pointer px-3 py-1.5 text-sm">
          📎 {fileName ?? "Přiložit soubor"}
          <input type="file" name="file" accept={ATTACHMENT_ACCEPT} className="sr-only" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} />
        </label>
        <span className="hidden text-xs text-ink-faint sm:inline">Ctrl/⌘ + Enter odešle · max. 5 MB</span>
        <SubmitButton pendingText="Odesílám…">Odeslat</SubmitButton>
      </div>
    </form>
  );
}
