import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { formatMoney } from "@/lib/format";
import { PLANS } from "@/lib/plans";
import { operator, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Obchodní podmínky",
  description: `Obchodní podmínky platformy ${site.name} pro lektory a studenty.`,
  alternates: { canonical: "/obchodni-podminky" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Obchodní podmínky" href="/obchodni-podminky" updated="1. 12. 2026">
      <h2>1. Úvodní ustanovení</h2>
      <p>
        Tyto obchodní podmínky upravují používání platformy {site.name} dostupné na adrese {site.url} (dále jen „platforma“), kterou provozuje{" "}
        {operator.name}, IČO {operator.id}, se sídlem {operator.address} (dále jen „provozovatel“). Kontakt: {operator.email}.
      </p>
      <p>
        Platforma je software pro lektory jazyků (dále jen „lektor“), kteří s jeho pomocí evidují své studenty (dále jen „student“), prodávají
        jim lekce a plánují výuku. Provozovatel není poskytovatelem výuky ani stranou smlouvy o lekcích. Smlouva o poskytnutí lekcí i platba za
        ně vzniká přímo mezi lektorem a studentem.
      </p>

      <h2>2. Uživatelský účet</h2>
      <ul>
        <li>Pro využívání platformy je nutná registrace a ověření e-mailové adresy. Uživatel je povinen uvádět pravdivé údaje a chránit své přihlašovací údaje.</li>
        <li>Účet studenta mohou zakládat osoby starší 15 let; mladší osoby jen se souhlasem zákonného zástupce.</li>
        <li>Uživatel může svůj účet kdykoli zrušit v nastavení účtu.</li>
        <li>Provozovatel může účet pozastavit nebo zrušit, pokud uživatel porušuje tyto podmínky nebo právní předpisy.</li>
      </ul>

      <h2>3. Předplatné pro lektory</h2>
      <ul>
        <li>
          Lektor platí provozovateli měsíční předplatné podle zvoleného tarifu, který určuje nejvyšší počet aktivních (nearchivovaných)
          studentů:{" "}
          {PLANS.map((p) => `${p.name} – ${p.priceCents ? `${formatMoney(p.priceCents)}/měsíc` : "zdarma"} (${p.maxStudents ? `až ${p.maxStudents} studentů` : "neomezeně"})`).join("; ")}.
          Ceny jsou konečné.
        </li>
        <li>Provozovatel si z plateb studentů za lekce nebere žádnou provizi.</li>
        <li>Předplatné se platí kartou předem na každý měsíc a obnovuje se automaticky. Fakturu provozovatel vystaví elektronicky.</li>
        <li>
          Lektor může tarif kdykoli zvýšit (doplatí poměrnou část) nebo snížit, pokud počet jeho aktivních studentů nepřesahuje limit nového
          tarifu. Předplatné lze zrušit kdykoli s účinností ke konci zaplaceného období; poté přechází účet na tarif Zdarma.
        </li>
        <li>
          Pokud se platbu předplatného nepodaří strhnout, přechází účet po marném upozornění na tarif Zdarma. Stávající studenti mohou pokračovat
          ve výuce, noví se však nemohou zapsat, dokud lektor nemá dostatečný tarif.
        </li>
        <li>
          Lektor odpovídá za obsah svého profilu, za kvalitu výuky, za dodržení sjednaných termínů, za vrácení peněz studentům a za plnění svých
          daňových a jiných zákonných povinností. Lektor je povinen vyplnit pravdivé fakturační a daňové údaje (viz čl. 8).
        </li>
      </ul>

      <h2>4. Nákup lekcí studentem</h2>
      <ul>
        <li>Cenu lekcí a balíčků určuje lektor. Prodávajícím je lektor.</li>
        <li>
          Student platí buď kartou – platba jde přímo na platební účet lektora u společnosti Stripe – nebo bankovním převodem na účet lektora.
          U převodu se lekce připíší poté, co lektor potvrdí přijetí platby.
        </li>
        <li>Zakoupené lekce může student čerpat rezervací volných termínů lektora. Má-li balíček omezenou platnost, je uvedena u balíčku před nákupem.</li>
        <li>Zkušební lekci lze u každého lektora zakoupit pouze jednou.</li>
      </ul>

      <h2>5. Rezervace, přesun, storno a neúčast</h2>
      <ul>
        <li>Student může rezervovanou lekci přesunout nebo zrušit nejpozději ve lhůtě uvedené u lektora (výchozí 24 hodin předem); zrušená lekce se mu vrátí do balíčku.</li>
        <li>Při pozdějším zrušení nebo neúčasti studenta lekce propadá.</li>
        <li>Zruší-li lekci lektor, vrací se lekce studentovi vždy.</li>
      </ul>

      <h2>6. Odstoupení od smlouvy a vrácení peněz</h2>
      <p>
        Student, který je spotřebitelem, může od smlouvy o poskytnutí lekcí odstoupit bez udání důvodu do 14 dnů od nákupu. Pokud však výslovně
        požádal o zahájení výuky před uplynutím této lhůty (rezervací lekce), hradí poměrnou část ceny za již čerpané lekce. Peníze za nevyčerpané
        lekce vrací lektor – přes platformu (u plateb kartou automaticky na kartu) nebo převodem. Provozovatel poskytne součinnost na adrese{" "}
        {operator.email}.
      </p>

      <h2>7. Hodnocení, zprávy a materiály</h2>
      <p>
        Hodnotit lektora může pouze student, který u něj absolvoval alespoň jednu lekci. Hodnocení musí být pravdivé a nesmí obsahovat urážlivý
        obsah. Zprávy a sdílené soubory nesmí porušovat práva třetích osob (zejména autorská práva). Provozovatel může nevhodný obsah skrýt nebo odstranit.
      </p>

      <h2>8. Údaje pro daňové účely (DAC7)</h2>
      <p>
        Provozovatel může být jako provozovatel digitální platformy povinen hlásit správci daně údaje o lektorech a jejich příjmech za lekce
        sjednané přes platformu (zákon o mezinárodní spolupráci při správě daní, směrnice Rady (EU) 2021/514). Lektor je proto povinen uvést
        a aktualizovat své identifikační údaje. Neposkytne-li je ani po upozornění, může provozovatel jeho profil skrýt.
      </p>

      <h2>9. Odpovědnost</h2>
      <p>
        Provozovatel neodpovídá za průběh a kvalitu výuky, za platby mezi lektorem a studentem ani za spory mezi nimi. Provozovatel usiluje
        o nepřetržitou dostupnost platformy, ale nezaručuje ji.
      </p>

      <h2>10. Řešení sporů</h2>
      <p>
        Spotřebitel má právo na mimosoudní řešení spotřebitelského sporu u České obchodní inspekce (www.coi.cz). Spory se řídí právním řádem
        České republiky.
      </p>

      <h2>11. Závěrečná ustanovení</h2>
      <p>
        Provozovatel může tyto podmínky změnit; o změně informuje registrované uživatele e-mailem alespoň 14 dní předem. Zpracování osobních údajů
        upravují <Link href="/ochrana-osobnich-udaju" className="text-brand-600 underline">Zásady ochrany osobních údajů</Link>.
      </p>
    </LegalPage>
  );
}
