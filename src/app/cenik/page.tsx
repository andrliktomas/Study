import type { Metadata } from "next";
import Link from "next/link";
import { Faq } from "@/components/Faq";
import { formatMoney } from "@/lib/format";
import { PLANS, PLAN_FEATURES } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Ceník – předplatné podle počtu studentů, bez provize",
  description: "Do 3 studentů zdarma. Pak měsíční předplatné podle počtu aktivních studentů. Žádná provize z lekcí – co si vyděláte, je vaše.",
  alternates: { canonical: "/cenik" },
};

export default function PricingPage() {
  return (
    <div className="container-page py-14">
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">Ceník</p>
        <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">Platíte podle počtu studentů</h1>
        <p className="mt-4 text-lg text-ink-soft">Žádná provize z lekcí. Pro studenty je platforma vždy zdarma.</p>
      </div>
      <div className="mx-auto mt-12 grid max-w-6xl gap-5 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((p) => (
          <div key={p.id} className={`card relative flex flex-col ${p.highlight ? "border-brand-300 shadow-glow" : ""}`}>
            {p.highlight && <span className="badge absolute right-5 top-5 bg-brand-500 text-white">Oblíbený</span>}
            <h2 className="text-lg font-semibold">{p.name}</h2>
            <p className="mt-4 whitespace-nowrap text-4xl font-extrabold">{formatMoney(p.prices.czk, "czk")}</p>
            <p className="text-sm text-ink-faint">měsíčně{p.prices.eur > 0 && <> · {formatMoney(p.prices.eur, "eur")}</>}</p>
            <p className="mt-3 font-medium text-brand-700">{p.maxStudents ? `až ${p.maxStudents} aktivních studentů` : "neomezeně studentů"}</p>
            <Link href="/registrace?role=tutor" className={`${p.highlight ? "btn-primary" : "btn-secondary"} mt-6 w-full`}>
              {p.prices.czk ? "Vybrat tarif" : "Začít zdarma"}
            </Link>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-8 max-w-3xl rounded-2xl bg-brand-50 p-6">
        <h2 className="font-semibold">Ve všech tarifech</h2>
        <ul className="mt-3 grid gap-2 text-sm text-ink-soft sm:grid-cols-2">
          {PLAN_FEATURES.map((f) => <li key={f}>✓ {f}</li>)}
        </ul>
      </div>
      <div className="mx-auto mt-16 max-w-3xl">
        <Faq
          items={[
            { q: "Kdo je aktivní student?", a: "Každý student, kterého nemáte v archivu. Archivovaní studenti se do tarifu nepočítají a jejich historie zůstává zachovaná." },
            { q: "Co když překročím limit tarifu?", a: "Stávající studenti fungují dál, jen se k vám nemohou zapsat noví. Stačí přejít na vyšší tarif nebo archivovat neaktivní studenty." },
            { q: "Platím nějaké poplatky z lekcí?", a: "Ne. Studenti vám platí převodem přímo na váš bankovní účet – v korunách, eurech, dolarech i dalších měnách. Platforma z toho nic nemá." },
            { q: "Jak se platí předplatné?", a: "Převodem na fakturu (v CZK nebo EUR). Fakturu s QR kódem dostanete e-mailem, vyšší tarif platí hned a máte 14 dní na úhradu. Další měsíc vám fakturu pošleme 7 dní předem." },
            { q: "Mohu předplatné kdykoli zrušit?", a: "Ano. Předplatné běží do konce zaplaceného měsíce a pak přejdete na tarif Zdarma. Žádné automatické strhávání z karty – další měsíc platíte jen tehdy, když uhradíte fakturu." },
          ]}
        />
      </div>
    </div>
  );
}
