import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Faq } from "@/components/Faq";
import { TutorCard } from "@/components/TutorCard";
import { LANGUAGES, languageBySlug } from "@/lib/languages";
import { getPublishedTutors } from "@/lib/tutors";

export const revalidate = 600;

export function generateStaticParams() {
  return LANGUAGES.map((l) => ({ slug: l.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const l = languageBySlug(params.slug);
  if (!l) return {};
  return {
    title: `Online lektor ${l.genitive} – lekce přes videohovor`,
    description: `Lekce ${l.genitive} online s ověřenými lektory. Zkušební hodina, výhodné balíčky lekcí a rezervace termínu jedním kliknutím.`,
    alternates: { canonical: `/jazyky/${l.slug}` },
  };
}

export default async function LanguagePage({ params }: { params: { slug: string } }) {
  const l = languageBySlug(params.slug);
  if (!l) notFound();
  const tutors = await getPublishedTutors({ language: l.code });

  return (
    <div className="container-page py-10">
      <Breadcrumbs items={[{ name: "Domů", href: "/" }, { name: "Lektoři", href: "/lektori" }, { name: l.name, href: `/jazyky/${l.slug}` }]} />
      <header className="mt-6 max-w-3xl">
        <span className="text-5xl" aria-hidden>{l.flag}</span>
        <h1 className="mt-3 text-4xl font-bold">Online lektor {l.genitive}</h1>
        <p className="mt-4 text-lg text-ink-soft">
          Učte se {l.name.toLowerCase()} z pohodlí domova. Vyberte si lektora, domluvte si zkušební lekci a pak už jen rezervujte termíny,
          které vám vyhovují. Lekce probíhají přes videohovor a vždy víte, kolik hodin vám zbývá i co jste na nich probírali.
        </p>
      </header>

      <section className="mt-10" aria-labelledby="list">
        <h2 id="list" className="text-2xl font-semibold">Lektoři {l.genitive} ({tutors.length})</h2>
        {tutors.length === 0 ? (
          <div className="card mt-6">
            <p>Zatím tu nemáme žádného lektora {l.genitive}.</p>
            <p className="mt-1 text-sm text-ink-soft">
              Učíte {l.name.toLowerCase()}? <Link href="/registrace?role=tutor" className="text-brand-600 underline">Založte si profil zdarma</Link> a buďte první.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tutors.map((t) => <TutorCard key={t.id} tutor={t} />)}
          </div>
        )}
      </section>

      <section className="mt-16 max-w-3xl" aria-labelledby="faq">
        <h2 id="faq" className="text-2xl font-semibold">Časté dotazy k výuce {l.genitive}</h2>
        <div className="mt-6">
          <Faq
            items={[
              { q: `Jak probíhá online lekce ${l.genitive}?`, a: "Lekce probíhá přes videohovor (např. Google Meet nebo Zoom). Odkaz dostanete e-mailem a najdete ho i ve svém přehledu na platformě." },
              { q: "Mohu si nejdřív vyzkoušet zkušební lekci?", a: "Většina lektorů nabízí zkušební lekci za zvýhodněnou cenu. Najdete ji v ceníku na profilu lektora." },
              { q: "Co když nestihnu lekci?", a: "Lekci můžete zrušit ve lhůtě, kterou si lektor nastavil (obvykle 24 hodin předem), a lekce se vám vrátí do balíčku." },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
