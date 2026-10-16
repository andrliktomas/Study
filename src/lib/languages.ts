export type Language = {
  code: string;
  name: string;
  // tvar pro URL a SEO nadpisy: "Lektoři angličtiny"
  slug: string;
  genitive: string;
  flag: string;
};

export const LANGUAGES: Language[] = [
  { code: "en", name: "Angličtina", slug: "anglictina", genitive: "angličtiny", flag: "🇬🇧" },
  { code: "de", name: "Němčina", slug: "nemcina", genitive: "němčiny", flag: "🇩🇪" },
  { code: "es", name: "Španělština", slug: "spanelstina", genitive: "španělštiny", flag: "🇪🇸" },
  { code: "fr", name: "Francouzština", slug: "francouzstina", genitive: "francouzštiny", flag: "🇫🇷" },
  { code: "it", name: "Italština", slug: "italstina", genitive: "italštiny", flag: "🇮🇹" },
  { code: "ru", name: "Ruština", slug: "rustina", genitive: "ruštiny", flag: "🇷🇺" },
  { code: "pt", name: "Portugalština", slug: "portugalstina", genitive: "portugalštiny", flag: "🇵🇹" },
  { code: "zh", name: "Čínština", slug: "cinstina", genitive: "čínštiny", flag: "🇨🇳" },
  { code: "ja", name: "Japonština", slug: "japonstina", genitive: "japonštiny", flag: "🇯🇵" },
  { code: "cs", name: "Čeština pro cizince", slug: "cestina-pro-cizince", genitive: "češtiny pro cizince", flag: "🇨🇿" },
];

export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function languageByCode(code: string) {
  return LANGUAGES.find((l) => l.code === code);
}

export function languageBySlug(slug: string) {
  return LANGUAGES.find((l) => l.slug === slug);
}

export function parseList(csv: string | null | undefined) {
  return (csv ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
