import Link from "next/link";
import { absoluteUrl } from "@/lib/site";
import { JsonLd } from "./JsonLd";

export function Breadcrumbs({ items }: { items: { name: string; href: string }[] }) {
  return (
    <nav aria-label="Drobečková navigace" className="text-sm text-ink-faint">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(it.href) })),
        }}
      />
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((it, i) => (
          <li key={it.href} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden>/</span>}
            {i === items.length - 1 ? (
              <span className="text-ink-soft" aria-current="page">{it.name}</span>
            ) : (
              <Link href={it.href} className="hover:text-brand-600">{it.name}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
