export const site = {
  name: "Lektorium",
  tagline: "Platforma pro online lektory jazyků",
  description:
    "Najděte si online lektora angličtiny, němčiny, španělštiny a dalších jazyků. Lektoři zde spravují studenty, prodávají balíčky lekcí a plánují hodiny přes Google Kalendář – bez provize z lekcí.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  locale: "cs_CZ",
};

export function absoluteUrl(path = "/") {
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Obrázek může být externí (Google) nebo náš (/api/soubory/…) – pro OG a JSON-LD potřebujeme absolutní URL. */
export function absoluteImage(src: string | null | undefined) {
  if (!src) return undefined;
  return src.startsWith("/") ? absoluteUrl(src) : src;
}

/** Údaje provozovatele – doplňte v .env, zobrazují se v obchodních podmínkách a zásadách ochrany údajů. */
export const operator = {
  name: process.env.OPERATOR_NAME || "[Název / jméno provozovatele]",
  id: process.env.OPERATOR_ID || "[IČO]",
  address: process.env.OPERATOR_ADDRESS || "[Sídlo / adresa]",
  email: process.env.OPERATOR_EMAIL || "[kontaktní e-mail]",
};
