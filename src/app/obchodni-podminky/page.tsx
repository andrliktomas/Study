import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { operator, platformFeePercent, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Obchodní podmínky",
  description: `Obchodní podmínky platformy ${site.name} pro lektory a studenty.`,
  alternates: { canonical: "/obchodni-podminky" },
};

export default function TermsPage() {
  const fee = platformFeePercent();
  return (
    <LegalPage title="Obchodní podmínky" href="/obchodni-podminky" updated="1. 11. 2026">
      <h2>1. Úvodní ustanovení</h2>
      <p>
        Tyto obchodní podmínky upravují používání platformy {site.name} dostupné na adrese {site.url} (dále jen „platforma“), kterou provozuje{" "}
        {operator.name}, IČO {operator.id}, se sídlem {operator.address} (dále jen „provozovatel“). Kontakt: {operator.email}.
      </p>
      <p>
        Platforma je zprostředkovatelská služba, která propojuje lektory jazyků (dále jen „lektor“) s jejich studenty (dále jen „student“).
        Provozovatel není poskytovatelem výuky. Smlouva o poskytnutí lekcí vzniká přímo mezi lektorem a studentem.
      </p>

      <h2>2. Uživatelský účet</h2>
      <ul>
        <li>Pro využívání platformy je nutná registrace. Uživatel je povinen uvádět pravdivé údaje a chránit své přihlašovací údaje.</li>
        <li>Účet studenta mohou zakládat osoby starší 15 let; mladší osoby jen se souhlasem zákonného zástupce.</li>
        <li>Provozovatel může účet pozastavit nebo zrušit, pokud uživatel porušuje tyto podmínky nebo právní předpisy.</li>
      </ul>

      <h2>3. Podmínky pro lektory</h2>
      <ul>
        <li>Založení profilu, inzerce a používání všech funkcí platformy je pro lektory zdarma.</li>
        <li>
          Za zprostředkování náleží provozovateli provize ve výši <strong>{fee} %</strong> z ceny každé lekce či balíčku prodaného přes platformu.
          Provize se strhává automaticky při platbě kartou přes službu Stripe.
        </li>
        <li>
          Pokud lektor studentovi připíše lekce ručně (např. při platbě mimo platformu), je povinen uvést skutečně přijatou částku a provizi z ní
          uhradit provozovateli na účet {operator.bankAccount} do 14 dnů od vyúčtování. Uvádění nepravdivých částek je podstatným porušením podmínek.
        </li>
        <li>Lektor odpovídá za obsah svého profilu, za kvalitu výuky, za dodržení sjednaných termínů a za plnění svých daňových a jiných zákonných povinností.</li>
        <li>Pro přijímání plateb musí lektor projít ověřením u platební služby Stripe a souhlasit s jejími podmínkami.</li>
      </ul>

      <h2>4. Nákup lekcí studentem</h2>
      <ul>
        <li>Cenu lekcí a balíčků určuje lektor. Ceny jsou konečné.</li>
        <li>Platba probíhá kartou přes službu Stripe. Po zaplacení se lekce připíší na účet studenta u daného lektora.</li>
        <li>Zakoupené lekce může student čerpat rezervací volných termínů lektora. Lekce z balíčku nejsou časově omezené, pokud lektor neuvede jinak.</li>
        <li>Zkušební lekci lze u každého lektora zakoupit pouze jednou.</li>
      </ul>

      <h2>5. Rezervace, storno a neúčast</h2>
      <ul>
        <li>Student může rezervovanou lekci zrušit nejpozději ve lhůtě uvedené u lektora (výchozí 24 hodin předem); lekce se mu vrátí do balíčku.</li>
        <li>Při pozdějším zrušení nebo neúčasti studenta lekce propadá.</li>
        <li>Zruší-li lekci lektor, vrací se lekce studentovi vždy.</li>
      </ul>

      <h2>6. Odstoupení od smlouvy a vrácení peněz</h2>
      <p>
        Student, který je spotřebitelem, může od smlouvy o poskytnutí lekcí odstoupit bez udání důvodu do 14 dnů od nákupu. Pokud však výslovně
        požádal o zahájení výuky před uplynutím této lhůty (rezervací lekce), hradí poměrnou část ceny za již čerpané lekce. Žádost o vrácení peněz
        za nevyčerpané lekce řeší student s lektorem; provozovatel poskytne součinnost na adrese {operator.email}.
      </p>

      <h2>7. Hodnocení</h2>
      <p>
        Hodnotit lektora může pouze student, který u něj absolvoval alespoň jednu lekci. Hodnocení musí být pravdivé a nesmí obsahovat urážlivý
        obsah. Provozovatel může nevhodná hodnocení skrýt.
      </p>

      <h2>8. Odpovědnost</h2>
      <p>
        Provozovatel neodpovídá za průběh a kvalitu výuky ani za spory mezi lektorem a studentem. Provozovatel usiluje o nepřetržitou dostupnost
        platformy, ale nezaručuje ji.
      </p>

      <h2>9. Řešení sporů</h2>
      <p>
        Spotřebitel má právo na mimosoudní řešení spotřebitelského sporu u České obchodní inspekce (www.coi.cz). Spory se řídí právním řádem
        České republiky.
      </p>

      <h2>10. Závěrečná ustanovení</h2>
      <p>
        Provozovatel může tyto podmínky změnit; o změně informuje registrované uživatele e-mailem alespoň 14 dní předem. Zpracování osobních údajů
        upravují <Link href="/ochrana-osobnich-udaju" className="text-brand-600 underline">Zásady ochrany osobních údajů</Link>.
      </p>
    </LegalPage>
  );
}
