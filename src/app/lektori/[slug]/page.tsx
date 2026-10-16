import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { PackageList } from "@/components/PackageList";
import { db } from "@/lib/db";
import { languageByCode, parseList } from "@/lib/languages";
import { absoluteUrl } from "@/lib/site";
import { getCurrentUser } from "@/lib/session";

async function getTutor(slug: string) {
  return db.tutorProfile.findFirst({
    where: { slug, published: true },
    include: {
      user: { select: { name: true, image: true, timezone: true } },
      packages: { where: { active: true }, orderBy: [{ sortOrder: "asc" }, { priceCents: "asc" }] },
      _count: { select: { enrollments: true, lessons: { where: { status: "COMPLETED" } } } },
    },
  });
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const t = await getTutor(params.slug);
  if (!t) return {};
  const langs = parseList(t.languages).map((c) => languageByCode(c)?.genitive).filter(Boolean).join(", ");
  const title = `${t.user.name} – online lektor ${langs}`;
  const description = (t.headline ? `${t.headline}. ` : "") + t.bio.slice(0, 140);
  return {
    title,
    description,
    alternates: { canonical: `/lektori/${t.slug}` },
    openGraph: { title, description, type: "profile", images: t.user.image ? [t.user.image] : undefined },
  };
}

export default async function TutorPage({ params }: { params: { slug: string } }) {
  const t = await getTutor(params.slug);
  if (!t) notFound();
  const user = await getCurrentUser();
  const langs = parseList(t.languages).map((c) => languageByCode(c)).filter((l) => l !== undefined);

  return (
    <div className="container-page py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: t.user.name,
          jobTitle: "Lektor jazyků",
          description: t.bio,
          image: t.user.image ?? undefined,
          url: absoluteUrl(`/lektori/${t.slug}`),
          knowsLanguage: langs.map((l) => l.name),
          makesOffer: t.packages.map((p) => ({
            "@type": "Offer",
            name: p.name,
            price: (p.priceCents / 100).toFixed(2),
            priceCurrency: p.currency.toUpperCase(),
            itemOffered: { "@type": "Service", name: `${p.name} (${p.lessonCount}× ${p.durationMin} min)` },
          })),
        }}
      />
      <Breadcrumbs items={[{ name: "Domů", href: "/" }, { name: "Lektoři", href: "/lektori" }, { name: t.user.name ?? "Lektor", href: `/lektori/${t.slug}` }]} />

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <article className="lg:col-span-2">
          <div className="card flex flex-col gap-6 sm:flex-row sm:items-center">
            <Avatar name={t.user.name} image={t.user.image} size={96} />
            <div>
              <h1 className="text-3xl font-bold">{t.user.name}</h1>
              {t.headline && <p className="mt-1 text-lg text-ink-soft">{t.headline}</p>}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {langs.map((l) => (
                  <Link key={l.code} href={`/jazyky/${l.slug}`} className="chip hover:border-brand-300">{l.flag} {l.name}</Link>
                ))}
                {parseList(t.levels).map((lv) => <span key={lv} className="badge bg-slate-100 text-ink-soft">{lv}</span>)}
              </div>
            </div>
          </div>

          <section className="card mt-6">
            <h2 className="text-xl font-semibold">O mně</h2>
            <div className="prose-lite mt-3">
              {t.bio.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 text-sm sm:grid-cols-3">
              <div><dt className="text-ink-faint">Studentů</dt><dd className="text-lg font-semibold">{t._count.enrollments}</dd></div>
              <div><dt className="text-ink-faint">Odučených lekcí</dt><dd className="text-lg font-semibold">{t._count.lessons}</dd></div>
              {t.city && <div><dt className="text-ink-faint">Město</dt><dd className="text-lg font-semibold">{t.city}</dd></div>}
            </dl>
          </section>
        </article>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card">
            <h2 className="text-xl font-semibold">Ceník lekcí</h2>
            <p className="mt-1 text-sm text-ink-soft">Lekce probíhají online přes videohovor.</p>
            <PackageList packages={t.packages} tutorId={t.id} loggedIn={Boolean(user)} returnTo={`/lektori/${t.slug}`} />
          </div>
        </aside>
      </div>
    </div>
  );
}
