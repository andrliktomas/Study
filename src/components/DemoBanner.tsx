import Link from "next/link";

export function DemoBanner() {
  return (
    <div className="bg-ink px-4 py-2 text-center text-xs text-white print:hidden sm:text-sm">
      <strong>Ukázková verze.</strong> E-maily se neodesílají –{" "}
      <Link href="/demo/posta" className="font-semibold text-brand-200 underline">otevřít demo schránku</Link>. Testovací účty:{" "}
      <code>lektor@example.com</code>, <code>student@example.com</code>, <code>admin@example.com</code> (heslo <code>heslo1234</code>).
    </div>
  );
}
