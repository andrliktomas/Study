import { Breadcrumbs } from "./Breadcrumbs";

export function LegalPage({ title, href, updated, children }: { title: string; href: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="container-page max-w-3xl py-10">
      <Breadcrumbs items={[{ name: "Domů", href: "/" }, { name: title, href }]} />
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-ink-faint">Účinné od {updated}</p>
      <div className="legal mt-8 space-y-6 text-[15px] leading-relaxed text-ink-soft [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ol>li]:list-decimal [&_ul]:space-y-1.5">
        {children}
      </div>
    </div>
  );
}
