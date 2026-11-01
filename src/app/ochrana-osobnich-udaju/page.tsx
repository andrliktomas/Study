import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { operator, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Ochrana osobních údajů (GDPR)",
  description: `Jak ${site.name} zpracovává osobní údaje lektorů a studentů.`,
  alternates: { canonical: "/ochrana-osobnich-udaju" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Ochrana osobních údajů" href="/ochrana-osobnich-udaju" updated="1. 11. 2026">
      <h2>1. Správce</h2>
      <p>
        Správcem osobních údajů je {operator.name}, IČO {operator.id}, {operator.address}. Kontakt pro záležitosti ochrany osobních údajů:{" "}
        {operator.email}.
      </p>
      <p>
        Lektor je ve vztahu k údajům svých studentů (poznámky k výuce, záznamy z lekcí) samostatným správcem; provozovatel tyto údaje zpracovává
        jako zpracovatel pro lektora.
      </p>

      <h2>2. Jaké údaje zpracováváme</h2>
      <ul>
        <li><strong>Účet:</strong> jméno, e-mail, heslo (pouze v zašifrované podobě), profilová fotka a ID z Google účtu při přihlášení přes Google, časové pásmo.</li>
        <li><strong>Profil lektora:</strong> údaje, které lektor sám zveřejní (popis, jazyky, ceník, město).</li>
        <li><strong>Výuka:</strong> rezervace, stav lekcí, poznámky, domácí úkoly, hodnocení.</li>
        <li><strong>Platby:</strong> přehled nákupů a částek a variabilní symbol. Platby probíhají převodem mezi studentem a lektorem; údaje o platební kartě nezpracováváme.</li>
        <li><strong>Lektoři:</strong> bankovní účty pro platby studentů (majitel, IBAN / číslo účtu, SWIFT/BIC, banka), fakturační a daňové údaje (jméno nebo firma, adresa, IČO, DIČ, případně datum narození) pro faktury za předplatné a hlášení DAC7.</li>
        <li><strong>Zprávy a soubory:</strong> zprávy mezi lektorem a studentem a sdílené materiály.</li>
        <li><strong>Google Kalendář:</strong> pokud jej lektor připojí, čteme pouze informaci obsazeno/volno a vytváříme události s lekcemi. Obsah ostatních událostí nečteme.</li>
        <li><strong>Technické údaje:</strong> IP adresa a záznamy o přihlášení pro zajištění bezpečnosti.</li>
      </ul>

      <h2>3. Účel a právní základ</h2>
      <ul>
        <li>Poskytování služby platformy a plnění smlouvy (čl. 6 odst. 1 písm. b GDPR).</li>
        <li>Plnění zákonných povinností, zejména účetních a daňových, včetně hlášení údajů o lektorech a jejich příjmech správci daně podle pravidel DAC7 (čl. 6 odst. 1 písm. c GDPR).</li>
        <li>Oprávněný zájem na zabezpečení služby a předcházení podvodům (čl. 6 odst. 1 písm. f GDPR).</li>
        <li>Zasílání provozních e-mailů (pozvánky, potvrzení a připomínky lekcí, reset hesla) je nezbytnou součástí služby.</li>
      </ul>

      <h2>4. Příjemci a zpracovatelé</h2>
      <ul>
        <li>Finanční správa ČR – hlášení DAC7 o lektorech (jen údaje lektorů).</li>
        <li>Google Ireland Ltd. – přihlášení přes Google a Google Kalendář (jen pokud je uživatel využije).</li>
        <li>Poskytovatel hostingu a databáze a poskytovatel rozesílání e-mailů.</li>
        <li>Lektor vidí údaje svých studentů (jméno, e-mail, lekce, nákupy); student vidí údaje svého lektora.</li>
      </ul>
      <p>Někteří zpracovatelé mohou údaje předávat mimo EU, a to pouze na základě standardních smluvních doložek EU.</p>

      <h2>5. Doba uložení</h2>
      <p>
        Údaje uchováváme po dobu existence účtu. Při zrušení účtu osobní údaje okamžitě smažeme nebo anonymizujeme; anonymizované záznamy
        o lekcích a platbách zůstávají lektorovi kvůli jeho účetnictví. Údaje, které musíme uchovávat podle zákona (faktury, hlášení DAC7),
        uchováváme po zákonnou dobu (až 10 let).
      </p>

      <h2>6. Cookies</h2>
      <p>
        Používáme pouze nezbytné cookies pro přihlášení a zabezpečení. Návštěvnost měříme nástrojem Plausible Analytics, který nepoužívá cookies
        ani neukládá osobní údaje. Reklamní cookies nepoužíváme, proto nevyžadujeme souhlas s cookies.
      </p>

      <h2>7. Vaše práva</h2>
      <p>
        Máte právo na přístup k údajům, jejich opravu, výmaz, omezení zpracování, přenositelnost a právo vznést námitku. Export svých dat
        i smazání účtu najdete přímo v nastavení účtu. Ostatní žádosti posílejte na{" "}
        {operator.email}. Máte také právo podat stížnost u Úřadu pro ochranu osobních údajů (www.uoou.cz).
      </p>
    </LegalPage>
  );
}
