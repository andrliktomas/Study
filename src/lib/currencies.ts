export type Currency = { code: string; name: string };

// Měny, ve kterých mohou lektoři prodávat lekce. Ukládají se malými písmeny (ISO 4217).
export const CURRENCIES: Currency[] = [
  { code: "czk", name: "česká koruna" },
  { code: "eur", name: "euro" },
  { code: "usd", name: "americký dolar" },
  { code: "gbp", name: "britská libra" },
  { code: "pln", name: "polský zlotý" },
  { code: "chf", name: "švýcarský frank" },
];

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code) as [string, ...string[]];

export function currencyLabel(code: string) {
  const c = CURRENCIES.find((x) => x.code === code.toLowerCase());
  return c ? `${c.code.toUpperCase()} – ${c.name}` : code.toUpperCase();
}
