import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { getPost, getPosts } from "@/lib/blog";
import { formatDate } from "@/lib/format";
import { absoluteUrl, site } from "@/lib/site";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await getPost(params.slug);
  if (!p) return {};
  return {
    title: p.title,
    description: p.description,
    alternates: { canonical: `/blog/${p.slug}` },
    openGraph: { type: "article", title: p.title, description: p.description, publishedTime: p.date },
  };
}

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const p = await getPost(params.slug);
  if (!p) notFound();
  const others = (await getPosts()).filter((o) => o.slug !== p.slug).slice(0, 2);

  return (
    <div className="container-page max-w-3xl py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: p.title,
          description: p.description,
          datePublished: p.date,
          inLanguage: "cs-CZ",
          mainEntityOfPage: absoluteUrl(`/blog/${p.slug}`),
          author: { "@type": "Organization", name: site.name, url: site.url },
          publisher: { "@id": absoluteUrl("/#org") },
        }}
      />
      <Breadcrumbs items={[{ name: "Domů", href: "/" }, { name: "Blog", href: "/blog" }, { name: p.title, href: `/blog/${p.slug}` }]} />
      <article className="mt-6">
        <p className="text-sm text-ink-faint">{formatDate(new Date(p.date))} · {p.readingMinutes} min čtení</p>
        <h1 className="mt-2 text-4xl font-extrabold leading-tight">{p.title}</h1>
        <p className="mt-4 text-lg text-ink-soft">{p.description}</p>
        <div className="prose-article mt-8" dangerouslySetInnerHTML={{ __html: p.html }} />
      </article>

      <aside className="mt-12 rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 p-8 text-white shadow-glow">
        {p.audience === "lektori" ? (
          <>
            <h2 className="text-2xl font-bold text-white">Učíte jazyky online?</h2>
            <p className="mt-2 text-brand-50">Studenti, platby a rozvrh na jednom místě. Do 3 studentů zdarma, bez provize z lekcí.</p>
            <Link href="/registrace?role=tutor" className="btn mt-6 bg-white text-brand-700 hover:bg-brand-50">Založit profil lektora</Link>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-white">Najděte si svého lektora</h2>
            <p className="mt-2 text-brand-50">Online lekce angličtiny, němčiny, španělštiny a dalších jazyků. Většina lektorů nabízí zkušební lekci.</p>
            <Link href="/lektori" className="btn mt-6 bg-white text-brand-700 hover:bg-brand-50">Prohlédnout lektory</Link>
          </>
        )}
      </aside>

      {others.length > 0 && (
        <nav className="mt-12" aria-label="Další články">
          <h2 className="text-lg font-semibold">Další články</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {others.map((o) => (
              <li key={o.slug}><Link href={`/blog/${o.slug}`} className="card-hover block"><p className="font-semibold">{o.title}</p><p className="mt-1 text-sm text-ink-soft">{o.description}</p></Link></li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
