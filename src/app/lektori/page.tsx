import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { TutorCard } from "@/components/TutorCard";
import { LANGUAGES, languageByCode } from "@/lib/languages";
import { getPublishedTutors } from "@/lib/tutors";

export const metadata: Metadata = {
  title: "Online lektoři jazyků – katalog",
  description: "Vyberte si online lektora angličtiny, němčiny, španělštiny či jiného jazyka. Zkušební lekce, balíčky hodin a snadná rezervace termínů.",
  alternates: { canonical: "/lektori" },
};

export default async function TutorsPage({ searchParams }: { searchParams: { jazyk?: string; q?: string } }) {
  const lang = searchParams.jazyk ? languageByCode(searchParams.jazyk) : undefined;
  const tutors = await getPublishedTutors({ language: lang?.code, q: searchParams.q });

  return (
    <div className="container-page py-10">
      <Breadcrumbs items={[{ name: "Domů", href: "/" }, { name: "Lektoři", href: "/lektori" }]} />
      <h1 className="mt-4 text-4xl font-bold">Online lektoři jazyků</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">Najděte lektora, který vám sedne. Většina nabízí zkušební lekci, takže nic neriskujete.</p>

      <form className="mt-8 flex flex-col gap-3 sm:flex-row" role="search">
        <input name="q" defaultValue={searchParams.q} placeholder="Hledat podle jména, zaměření, města…" className="input sm:max-w-md" aria-label="Hledat lektora" />
        {lang && <input type="hidden" name="jazyk" value={lang.code} />}
        <button className="btn-primary">Hledat</button>
      </form>

      <div className="mt-5 flex flex-wrap gap-2" aria-label="Filtrovat podle jazyka">
        <Link href={{ pathname: "/lektori", query: searchParams.q ? { q: searchParams.q } : {} }} className={`chip px-3.5 py-1.5 text-sm ${!lang ? "!bg-brand-500 !text-white" : ""}`}>Všechny jazyky</Link>
        {LANGUAGES.map((l) => (
          <Link
            key={l.code}
            href={{ pathname: "/lektori", query: { jazyk: l.code, ...(searchParams.q ? { q: searchParams.q } : {}) } }}
            className={`chip px-3.5 py-1.5 text-sm transition hover:border-brand-300 ${lang?.code === l.code ? "!bg-brand-500 !text-white" : ""}`}
          >
            {l.flag} {l.name}
          </Link>
        ))}
      </div>

      {tutors.length === 0 ? (
        <div className="card mt-10 text-center">
          <p className="font-medium">Zatím tu nikoho nemáme.</p>
          <p className="mt-1 text-sm text-ink-soft">Jste lektor? <Link href="/registrace?role=tutor" className="text-brand-600 underline">Založte si profil zdarma</Link>.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tutors.map((t) => <TutorCard key={t.id} tutor={t} />)}
        </div>
      )}
    </div>
  );
}
