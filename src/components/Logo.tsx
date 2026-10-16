import Link from "next/link";
import { site } from "@/lib/site";

export function Logo() {
  return (
    <Link href="/" className="group inline-flex items-center gap-2 font-bold text-ink" aria-label={`${site.name} – domů`}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500 text-white shadow-glow transition group-hover:rotate-6">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
          <path d="M6 5v14h12" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="16" cy="8" r="2.5" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <span className="text-lg">{site.name}</span>
    </Link>
  );
}
