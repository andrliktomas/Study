// Bankovní účty a QR platba (formát SPAYD – "QR Platba" podporovaná českými bankami).

function mod97(digits: string) {
  let rem = 0;
  for (const ch of digits) rem = (rem * 10 + Number(ch)) % 97;
  return rem;
}

function ibanToDigits(iban: string) {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  return rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
}

export function isValidIban(iban: string) {
  const s = iban.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  return mod97(ibanToDigits(s)) === 1;
}

const CZ_WEIGHTS = [6, 3, 7, 9, 10, 5, 8, 4, 2, 1];

function czChecksumOk(num: string) {
  const padded = num.padStart(10, "0");
  const sum = [...padded].reduce((s, d, i) => s + Number(d) * CZ_WEIGHTS[i], 0);
  return sum % 11 === 0;
}

/** Převede český účet "19-2000145399/0800" nebo IBAN na IBAN. Vrací null, když je neplatný. */
export function normalizeAccount(input: string): string | null {
  const raw = input.replace(/\s+/g, "").toUpperCase();
  if (/^[A-Z]{2}/.test(raw)) return isValidIban(raw) ? raw : null;

  const m = raw.match(/^(?:(\d{1,6})-)?(\d{2,10})\/(\d{4})$/);
  if (!m) return null;
  const [, prefix = "", number, bank] = m;
  if ((prefix && !czChecksumOk(prefix)) || !czChecksumOk(number)) return null;
  const bban = bank + prefix.padStart(6, "0") + number.padStart(10, "0");
  const check = 98 - mod97(bban + "123500"); // "CZ00" → C=12, Z=35
  const iban = `CZ${String(check).padStart(2, "0")}${bban}`;
  return isValidIban(iban) ? iban : null;
}

export function formatIban(iban: string) {
  return iban.replace(/(.{4})/g, "$1 ").trim();
}

/** Zpět na český formát čísla účtu pro zobrazení (jen pro CZ IBAN). */
export function ibanToCzAccount(iban: string) {
  if (!iban.startsWith("CZ") || iban.length !== 24) return null;
  const bank = iban.slice(4, 8);
  const prefix = iban.slice(8, 14).replace(/^0+/, "");
  const number = iban.slice(14).replace(/^0+/, "");
  return `${prefix ? `${prefix}-` : ""}${number}/${bank}`;
}

export function spaydString(opts: { iban: string; amountCents: number; currency: string; vs: string; message: string }) {
  const msg = opts.message
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\*/g, "")
    .slice(0, 60);
  return [
    "SPD*1.0",
    `ACC:${opts.iban}`,
    `AM:${(opts.amountCents / 100).toFixed(2)}`,
    `CC:${opts.currency.toUpperCase()}`,
    `X-VS:${opts.vs}`,
    `MSG:${msg}`,
  ].join("*");
}

/** SWIFT / BIC: 4 písmena banka, 2 země, 2 lokalita, volitelně 3 pobočka. */
export function isValidBic(bic: string) {
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic.replace(/\s+/g, "").toUpperCase());
}

function asciiOnly(text: string, max: number) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "")
    .trim()
    .slice(0, max);
}

/**
 * EPC QR kód (SEPA převod v EUR, „GiroCode“) – podporují ho banky v eurozóně.
 * https://www.europeanpaymentscouncil.eu/document-library/guidance-documents/quick-response-code-guidelines-enable-data-capture-initiation
 */
export function epcString(opts: { iban: string; bic?: string | null; name: string; amountCents: number; reference: string }) {
  return [
    "BCD",
    "002",
    "1",
    "SCT",
    (opts.bic ?? "").replace(/\s+/g, "").toUpperCase(),
    asciiOnly(opts.name, 70),
    opts.iban,
    `EUR${(opts.amountCents / 100).toFixed(2)}`,
    "",
    "",
    asciiOnly(opts.reference, 140),
  ].join("\n");
}

export type PaymentQr = { kind: "spayd" | "epc"; label: string; payload: string };

/**
 * QR kód pro platbu: CZK na český účet → QR Platba (SPAYD), EUR na IBAN → EPC/SEPA.
 * Pro ostatní měny standardní QR neexistuje – student zadá údaje ručně.
 */
export function paymentQr(opts: {
  iban: string | null;
  bic?: string | null;
  holderName: string;
  currency: string;
  amountCents: number;
  vs: string;
  message: string;
}): PaymentQr | null {
  if (!opts.iban) return null;
  const currency = opts.currency.toLowerCase();
  if (currency === "czk" && opts.iban.startsWith("CZ")) {
    return {
      kind: "spayd",
      label: "QR Platba (české banky)",
      payload: spaydString({ iban: opts.iban, amountCents: opts.amountCents, currency, vs: opts.vs, message: opts.message }),
    };
  }
  if (currency === "eur") {
    return {
      kind: "epc",
      label: "SEPA QR / GiroCode (banky v eurozóně)",
      payload: epcString({ iban: opts.iban, bic: opts.bic, name: opts.holderName, amountCents: opts.amountCents, reference: `${opts.vs} ${opts.message}` }),
    };
  }
  return null;
}
