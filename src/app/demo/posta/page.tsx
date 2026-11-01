import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { demoMode, site } from "@/lib/site";

export const metadata: Metadata = { title: "Demo schránka", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const URL_RE = /(https?:\/\/[^\s<]+)/g;

/** Odkazy z e-mailů převedeme na relativní, aby fungovaly na jakékoli doméně ukázky. */
function MailText({ text }: { text: string }) {
  return (
    <>
      {text.split(URL_RE).map((part, i) => {
        if (i % 2 === 0) return <span key={i}>{part}</span>;
        const href = part.startsWith(site.url) ? part.slice(site.url.length) || "/" : part;
        return (
          <a key={i} href={href} className="break-all font-medium text-brand-700 underline">
            {href}
          </a>
        );
      })}
    </>
  );
}

export default async function DemoInbox(props: { searchParams: Promise<{ komu?: string }> }) {
  if (!demoMode) notFound();
  const { komu } = await props.searchParams;
  const mails = await db.demoMail.findMany({
    where: komu ? { to: { contains: komu.trim().toLowerCase(), mode: "insensitive" } } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="text-3xl font-bold">Demo schránka</h1>
      <p className="mt-2 text-ink-soft">
        V ukázkové verzi se e-maily neodesílají – všechny (ověření e-mailu, pozvánky, faktury, potvrzení plateb…) najdete tady.
        Odkazy v nich fungují.
      </p>
      <form className="mt-6 flex gap-2">
        <input name="komu" defaultValue={komu} placeholder="Filtrovat podle příjemce…" className="input max-w-sm" />
        <button className="btn-secondary">Filtrovat</button>
        {komu && <Link href="/demo/posta" className="btn-ghost">Vše</Link>}
      </form>
      {mails.length === 0 ? (
        <p className="card mt-6 text-sm text-ink-faint">Zatím žádné e-maily.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {mails.map((m, i) => (
            <li key={m.id}>
              <details className="card group p-5" open={i === 0}>
                <summary className="flex cursor-pointer list-none flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold">{m.subject}</span>
                  <span className="text-xs text-ink-faint">pro {m.to} · {formatDateTime(m.createdAt)}</span>
                </summary>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft"><MailText text={m.text} /></p>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
