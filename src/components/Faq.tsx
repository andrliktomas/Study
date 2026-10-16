import { JsonLd } from "./JsonLd";

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
        }}
      />
      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white shadow-soft">
        {items.map((i) => (
          <details key={i.q} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
              {i.q}
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{i.a}</p>
          </details>
        ))}
      </div>
    </>
  );
}
