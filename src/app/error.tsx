"use client";
import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-page py-24 text-center">
      <p className="text-6xl" aria-hidden>🛠️</p>
      <h1 className="mt-4 text-2xl font-bold">Něco se pokazilo</h1>
      <p className="mx-auto mt-2 max-w-md text-ink-soft">
        Omlouváme se, při načítání stránky došlo k chybě. Zkuste to prosím znovu – pokud potíže přetrvávají, napište nám.
      </p>
      {error.digest && <p className="mt-2 text-xs text-ink-faint">Kód chyby: {error.digest}</p>}
      <div className="mt-8 flex justify-center gap-3">
        <button type="button" onClick={reset} className="btn-primary">Zkusit znovu</button>
        <Link href="/" className="btn-secondary">Na úvod</Link>
      </div>
    </div>
  );
}
