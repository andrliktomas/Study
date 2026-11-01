import type { Metadata } from "next";
import Link from "next/link";
import { Faq } from "@/components/Faq";
import { formatMoney } from "@/lib/format";
import { PLANS } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Pro lektory – evidence studentů, platby a rezervace bez provize",
  description: "Systém pro online lektory jazyků: evidence studentů, prodej balíčků lekcí, platby kartou i QR převodem, rezervace s Google Kalendářem a poznámky z lekcí. Bez provize, do 3 studentů zdarma.",
  alternates: { canonical: "/pro-lektory" },
};

const ROWS = [
  ["Evidence studentů", "Každý student má kartu s historií lekcí, poznámkami a zbývajícími hodinami."],
  ["Pozvánky", "Pozvěte stávající studenty e-mailem nebo jim pošlete odkaz."],
  ["Balíčky a zkušební lekce", "Vlastní ceny, délka lekce, počet hodin v balíčku."],
  ["Platby kartou i převodem", "QR platba na váš účet nebo karta přes váš Stripe. Peníze jdou rovnou vám, bez provize."],
  ["Pravidelné lekce", "Student si jedním kliknutím zarezervuje stejný čas na několik týdnů dopředu."],
  ["Zprávy a materiály", "Komunikace se studenty a sdílení souborů na jednom místě."],
  ["Dostupnost a rezervace", "Nastavíte, kdy učíte, studenti si sami vyberou volný termín."],
  ["Google Kalendář + Meet", "Obsazené časy se skryjí, lekce se zapíší i s odkazem na hovor."],
  ["Storno podmínky", "Nastavíte, do kdy může student lekci zrušit bez ztráty hodiny."],
  ["Veřejný profil", "Bezplatná inzerce optimalizovaná pro Google."],
];

export default function ForTutorsPage() {
  const free = PLANS[0];
  const cheapest = PLANS.find((p) => p.priceCents > 0)!;
  return (
    <div className="container-page py-14">
      <div className="mx-auto max-w-3xl text-center">
        <p className="eyebrow">Pro lektory</p>
        <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">Celá vaše výuka na jednom místě</h1>
        <p className="mt-5 text-lg text-ink-soft">
          Konec excelových tabulek, ručního hlídání zaplacených hodin a domlouvání termínů přes zprávy. Do {free.maxStudents} studentů
          zdarma, pak od {formatMoney(cheapest.priceCents)} měsíčně – a z vašich lekcí si nikdy nebereme provizi.
        </p>
        <Link href="/registrace?role=tutor" className="btn-primary mt-8 px-6 py-3 text-base">Založit profil zdarma</Link>
      </div>

      <div className="mt-16 grid gap-4 sm:grid-cols-2">
        {ROWS.map(([t, d]) => (
          <div key={t} className="card-hover flex gap-4">
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-500 text-sm text-white">✓</span>
            <div>
              <h2 className="font-semibold">{t}</h2>
              <p className="mt-1 text-sm text-ink-soft">{d}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-20 max-w-3xl">
        <h2 className="section-title text-center">Otázky lektorů</h2>
        <div className="mt-8">
          <Faq
            items={[
              { q: "Musím mít živnostenský list?", a: "Platformu může používat každý, kdo legálně poskytuje výuku. Za zdanění příjmů odpovídá lektor. Pro platby kartou si zakládáte vlastní účet Stripe, který ověřuje vaši identitu." },
              { q: "Mohu převést stávající studenty?", a: "Ano. Ve svém přehledu jim pošlete pozvánku. Po přijetí si u vás mohou rovnou koupit lekce a rezervovat termíny." },
              { q: "Jak rychle dostanu peníze?", a: "Převodem okamžitě na váš účet – student zaplatí přes QR kód a vy platbu jedním kliknutím potvrdíte. Kartou na váš Stripe účet, ze kterého Stripe vyplácí obvykle do několika pracovních dní." },
              { q: "Co se počítá jako aktivní student?", a: "Každý student, kterého nemáte v archivu. Studenty, kteří u vás momentálně nestudují, můžete jedním kliknutím archivovat a do tarifu se nepočítají – historie lekcí jim zůstane." },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
