export const site = {
  name: "Lektorium",
  tagline: "Platforma pro online lektory jazyků",
  description:
    "Najděte si online lektora angličtiny, němčiny, španělštiny a dalších jazyků. Lektoři zde spravují studenty, prodávají balíčky lekcí a plánují hodiny přes Google Kalendář – bez provize z lekcí.",
  url: (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
  ).replace(/\/$/, ""),
  locale: "cs_CZ",
};

/** Ukázková verze: e-maily se neodesílají (jsou na /demo/posta), web se neindexuje, nahoře je lišta s testovacími účty. */
export const demoMode = process.env.DEMO_MODE === "1";

export function absoluteUrl(path = "/") {
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Obrázek může být externí (Google) nebo náš (/api/soubory/…) – pro OG a JSON-LD potřebujeme absolutní URL. */
export function absoluteImage(src: string | null | undefined) {
  if (!src) return undefined;
  return src.startsWith("/") ? absoluteUrl(src) : src;
}

/** Údaje provozovatele – doplňte v .env, zobrazují se v obchodních podmínkách, GDPR a na fakturách. */
export const operator = {
  name: process.env.OPERATOR_NAME || "[Název / jméno provozovatele]",
  id: process.env.OPERATOR_ID || "[IČO]",
  address: process.env.OPERATOR_ADDRESS || "[Sídlo / adresa]",
  email: process.env.OPERATOR_EMAIL || "[kontaktní e-mail]",
  // DIČ – vyplňte jen jako plátce DPH; faktury pak obsahují rozpis DPH
  vatId: process.env.OPERATOR_VAT_ID || null,
  vatRate: Number(process.env.OPERATOR_VAT_RATE || 21),
  // zápis v rejstříku (např. „Fyzická osoba zapsaná v živnostenském rejstříku“)
  registry: process.env.OPERATOR_REGISTRY || "",
};

export type OperatorAccount = { currency: string; holderName: string; iban: string; bic: string | null; bankName: string | null };

/** Bankovní účty provozovatele pro platby předplatného (CZK a/nebo EUR). */
export function operatorAccounts(): OperatorAccount[] {
  const holderName = process.env.OPERATOR_ACCOUNT_HOLDER || operator.name;
  return (["czk", "eur"] as const)
    .map((currency): OperatorAccount | null => {
      const iban = process.env[`OPERATOR_IBAN_${currency.toUpperCase()}`]?.replace(/\s+/g, "").toUpperCase();
      if (!iban) return null;
      return {
        currency,
        holderName,
        iban,
        bic: process.env[`OPERATOR_BIC_${currency.toUpperCase()}`]?.replace(/\s+/g, "").toUpperCase() || null,
        bankName: process.env[`OPERATOR_BANK_${currency.toUpperCase()}`] || null,
      };
    })
    .filter((a): a is OperatorAccount => a !== null)
    .concat(
      // ve vývoji bez nastavení použijeme vzorový účet z dokumentace ČNB, ať jde fakturace vyzkoušet
      !process.env.OPERATOR_IBAN_CZK && !process.env.OPERATOR_IBAN_EUR && process.env.NODE_ENV !== "production"
        ? [{ currency: "czk", holderName: "[vývoj – nastavte OPERATOR_IBAN_CZK]", iban: "CZ6508000000192000145399", bic: "GIBACZPX", bankName: null }]
        : [],
    );
}
