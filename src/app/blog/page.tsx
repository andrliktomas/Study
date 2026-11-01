import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getPosts } from "@/lib/blog";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Blog – tipy pro studenty jazyků a online lektory",
  description: "Jak si vybrat online lektora, jak se učit jazyky efektivně a jak jako lektor zvládnout administrativu kolem výuky.",
  alternates: { canonical: "/blog" },
};

export default async function BlogIndex() {
  const posts = await getPosts();
  return (
    <div className="container-page max-w-4xl py-10">
      <Breadcrumbs items={[{ name: "Domů", href: "/" }, { name: "Blog", href: "/blog" }]} />
      <h1 className="mt-4 text-4xl font-bold">Blog</h1>
      <p className="mt-3 text-lg text-ink-soft">Tipy pro studenty jazyků i pro lektory, kteří učí online.</p>
      <ul className="mt-10 grid gap-5 sm:grid-cols-2">
        {posts.map((p) => (
          <li key={p.slug}>
            <Link href={`/blog/${p.slug}`} className="card-hover flex h-full flex-col">
              <span className={`badge w-fit ${p.audience === "lektori" ? "bg-indigo-50 text-indigo-700" : "bg-brand-50 text-brand-700"}`}>
                {p.audience === "lektori" ? "Pro lektory" : "Pro studenty"}
              </span>
              <h2 className="mt-3 text-xl font-semibold">{p.title}</h2>
              <p className="mt-2 flex-1 text-sm text-ink-soft">{p.description}</p>
              <p className="mt-4 text-xs text-ink-faint">{formatDate(new Date(p.date))} · {p.readingMinutes} min čtení</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
