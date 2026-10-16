import Link from "next/link";
import { Faq } from "@/components/Faq";
import { TutorCard } from "@/components/TutorCard";
import { LANGUAGES } from "@/lib/languages";
import { platformFeePercent } from "@/lib/site";
import { getPublishedTutors } from "@/lib/tutors";

export const revalidate = 300;

const STEPS = [
  { t: "Lektor si založí profil", d: "Zdarma, za pár minut. Nastaví jazyky, ceník balíčků a časy, kdy učí." },
  { t: "Pozve své studenty", d: "Pošle pozvánku e-mailem nebo odkazem. Noví studenti ho najdou i v katalogu." },
  { t: "Student si koupí lekce", d: "Jednu, pět, deset nebo zkušební. Zaplatí kartou, peníze jdou rovnou lektorovi." },
  { t: "Rezervace a přehled", d: "Student si vybere volný termín, lekce se propíše do Google Kalendáře i s odkazem na hovor." },
];

const FEATURES = [
  { icon: "🗓️", t: "Google Kalendář", d: "Obsazené časy se automaticky skryjí, nové lekce se zapíšou i s Google Meet odkazem." },
  { icon: "🎟️", t: "Balíčky lekcí", d: "Prodávejte jednotlivé hodiny, zvýhodněné balíčky i zkušební lekce." },
  { icon: "📊", t: "Zbývající lekce", d: "Lektor i student vždy vidí, kolik lekcí zbývá a kolik se vyčerpalo." },
  { icon: "📝", t: "Poznámky z lekcí", d: "Co se probíralo a jaký je domácí úkol – přehledně u každé lekce." },
  { icon: "💳", t: "Online platby", d: "Bezpečné platby kartou přes Stripe. Žádné faktury ani upomínky." },
  { icon: "🌍", t: "Veřejný profil", d: "Inzerujte zdarma. Profil je optimalizovaný pro vyhledávače." },
];

export default async function Home() {
  const tutors = (await getPublishedTutors()).slice(0, 6);
  const fee = platformFeePercent();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="bg-grid absolute inset-0 -z-10" aria-hidden />
        <div className="absolute -right-32 -top-32 -z-10 h-96 w-96 rounded-full bg-brand-200/50 blur-3xl" aria-hidden />
        <div className="container-page grid items-center gap-12 py-16 md:grid-cols-2 md:py-24">
          <div className="animate-fade-up">
            <span className="chip">Zdarma pro lektory · platíte jen {fee} % z prodaných lekcí</span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-5xl">
              Online výuka jazyků <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">bez chaosu</span> v tabulkách
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-soft">
              {`Platforma pro lektory, kteří učí přes videohovor. Studenti, balíčky lekcí, platby, rezervace a Google Kalendář na jednom místě.`}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/registrace?role=tutor" className="btn-primary px-6 py-3 text-base">Založit profil lektora</Link>
              <Link href="/lektori" className="btn-secondary px-6 py-3 text-base">Najít lektora</Link>
            </div>
          </div>
          <HeroMock />
        </div>
      </section>

      {/* Jazyky */}
      <section className="container-page" aria-labelledby="langs">
        <h2 id="langs" className="sr-only">Jazyky</h2>
        <div className="flex flex-wrap justify-center gap-2">
          {LANGUAGES.map((l) => (
            <Link key={l.code} href={`/jazyky/${l.slug}`} className="chip px-4 py-2 text-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:bg-white hover:shadow-soft">
              {l.flag} {l.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Jak to funguje */}
      <section className="container-page mt-24" aria-labelledby="how">
        <p className="eyebrow">Jak to funguje</p>
        <h2 id="how" className="section-title mt-2">Od pozvánky k první lekci za pár minut</h2>
        <ol className="mt-10 grid gap-5 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.t} className="card-hover relative">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 font-bold text-brand-600">{i + 1}</span>
              <h3 className="mt-4 font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-ink-soft">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Funkce */}
      <section className="mt-24 bg-gradient-to-b from-brand-50/70 to-white py-20" aria-labelledby="features">
        <div className="container-page">
          <p className="eyebrow">Všechno, co lektor potřebuje</p>
          <h2 id="features" className="section-title mt-2">Méně administrativy, víc času na výuku</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.t} className="card-hover">
                <span className="text-3xl" aria-hidden>{f.icon}</span>
                <h3 className="mt-3 font-semibold">{f.t}</h3>
                <p className="mt-2 text-sm text-ink-soft">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lektoři */}
      {tutors.length > 0 && (
        <section className="container-page mt-20" aria-labelledby="tutors">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Katalog</p>
              <h2 id="tutors" className="section-title mt-2">Online lektoři jazyků</h2>
            </div>
            <Link href="/lektori" className="btn-ghost">Všichni lektoři →</Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tutors.map((t) => <TutorCard key={t.id} tutor={t} />)}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="container-page mt-24 max-w-3xl" aria-labelledby="faq">
        <p className="eyebrow text-center">Časté dotazy</p>
        <h2 id="faq" className="section-title mt-2 text-center">Na co se nás ptáte</h2>
        <div className="mt-8">
          <Faq
            items={[
              { q: "Kolik platforma stojí?", a: `Pro lektory i studenty je registrace a používání zdarma. Platforma si bere pouze provizi ${fee} % z ceny lekcí, které lektor skutečně prodá.` },
              { q: "Jak funguje propojení s Google Kalendářem?", a: "Lektor jedním kliknutím připojí svůj Google Kalendář. Obsazené časy se studentům nezobrazí a každá rezervovaná lekce se do kalendáře zapíše včetně odkazu na Google Meet. Student dostane pozvánku e-mailem." },
              { q: "Kdy dostane lektor peníze?", a: "Platby probíhají přes Stripe. Peníze jdou přímo na účet lektora, provize platformy se strhne automaticky a výplata na bankovní účet probíhá podle nastavení Stripe (obvykle do několika dní)." },
              { q: "Může student zrušit lekci?", a: "Ano, do lhůty, kterou si nastaví lektor (výchozí je 24 hodin předem). Lekce se mu v tom případě vrátí do balíčku." },
              { q: "Potřebuji speciální software na videohovory?", a: "Ne. Lekce mohou probíhat přes Google Meet, Zoom, Skype nebo jiný nástroj, který lektor používá." },
            ]}
          />
        </div>
      </section>

      {/* CTA */}
      <section className="container-page mt-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-14 text-center text-white shadow-glow">
          <div className="absolute -left-10 -top-10 h-40 w-40 animate-float rounded-full bg-white/10" aria-hidden />
          <h2 className="text-3xl font-bold text-white sm:text-4xl">Učíte jazyky online?</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-50">Založte si profil zdarma a převeďte své studenty na platformu ještě dnes.</p>
          <Link href="/registrace?role=tutor" className="btn mt-8 bg-white px-6 py-3 text-base text-brand-700 hover:bg-brand-50">Začít zdarma</Link>
        </div>
      </section>
    </>
  );
}

function HeroMock() {
  return (
    <div className="relative animate-fade-up [animation-delay:.15s]" aria-hidden>
      <div className="card relative z-10 rotate-1 transition duration-500 hover:rotate-0">
        <div className="flex items-center justify-between">
          <p className="font-semibold">Jana Nováková</p>
          <span className="badge bg-brand-100 text-brand-800">Angličtina B2</span>
        </div>
        <div className="mt-5">
          <div className="flex justify-between text-sm text-ink-soft"><span>Zbývá lekcí</span><span className="font-semibold text-ink">3 / 10</span></div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-brand-50"><div className="h-full w-[70%] rounded-full bg-gradient-to-r from-brand-400 to-brand-600" /></div>
        </div>
        <div className="mt-6 space-y-2">
          {["Po 16:00 · Past simple vs. present perfect", "St 17:30 · Konverzace: cestování", "Pá 15:00 · Opakování slovíček"].map((t, i) => (
            <div key={t} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm ${i === 0 ? "border-brand-200 bg-brand-50" : "border-slate-100"}`}>
              <span className={`h-2 w-2 rounded-full ${i === 0 ? "bg-brand-500" : "bg-slate-300"}`} />
              {t}
            </div>
          ))}
        </div>
      </div>
      <div className="card absolute -bottom-6 -left-6 z-20 hidden w-56 animate-float p-4 sm:block">
        <p className="text-xs text-ink-faint">Nová platba</p>
        <p className="mt-1 font-semibold">Balíček 5 lekcí</p>
        <p className="text-2xl font-bold text-brand-600">2 250 Kč</p>
      </div>
      <div className="absolute -right-4 -top-6 z-0 h-full w-full rounded-2xl bg-brand-100" />
    </div>
  );
}
