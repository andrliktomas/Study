export const site = {
  name: "Lektorium",
  tagline: "Platforma pro online lektory jazyků",
  description:
    "Najděte si online lektora angličtiny, němčiny, španělštiny a dalších jazyků. Lektoři zde zdarma spravují studenty, prodávají balíčky lekcí a plánují hodiny přes Google Kalendář.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  locale: "cs_CZ",
};

export function absoluteUrl(path = "/") {
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}

export function platformFeePercent() {
  const v = Number(process.env.PLATFORM_FEE_PERCENT ?? "10");
  return Number.isFinite(v) && v >= 0 && v < 100 ? v : 10;
}

/** Údaje provozovatele – doplňte v .env, zobrazují se v obchodních podmínkách a zásadách ochrany údajů. */
export const operator = {
  name: process.env.OPERATOR_NAME || "[Název / jméno provozovatele]",
  id: process.env.OPERATOR_ID || "[IČO]",
  address: process.env.OPERATOR_ADDRESS || "[Sídlo / adresa]",
  email: process.env.OPERATOR_EMAIL || "[kontaktní e-mail]",
  bankAccount: process.env.OPERATOR_BANK_ACCOUNT || "[číslo účtu pro úhradu provizí]",
};
