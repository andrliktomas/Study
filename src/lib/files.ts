export const AVATAR_MAX_BYTES = 600 * 1024;
export const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;

// Povolené typy příloh: dokumenty, obrázky, zvuk. Typ ověřujeme podle obsahu, ne podle přípony.
const SIGNATURES: { mime: string; ext: string[]; check: (b: Buffer) => boolean }[] = [
  { mime: "image/jpeg", ext: ["jpg", "jpeg"], check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", ext: ["png"], check: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/webp", ext: ["webp"], check: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP" },
  { mime: "application/pdf", ext: ["pdf"], check: (b) => b.subarray(0, 5).toString("latin1") === "%PDF-" },
  { mime: "audio/mpeg", ext: ["mp3"], check: (b) => b.subarray(0, 3).toString("latin1") === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) },
  { mime: "audio/mp4", ext: ["m4a"], check: (b) => b.subarray(4, 8).toString("latin1") === "ftyp" },
  // Office dokumenty jsou ZIP kontejnery
  { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: ["docx"], check: isZip },
  { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ext: ["xlsx"], check: isZip },
  { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", ext: ["pptx"], check: isZip },
  { mime: "application/vnd.oasis.opendocument.text", ext: ["odt"], check: isZip },
  { mime: "text/plain", ext: ["txt"], check: (b) => !b.includes(0) },
];

function isZip(b: Buffer) {
  return b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
}

export const ATTACHMENT_ACCEPT = SIGNATURES.map((s) => s.ext.map((e) => `.${e}`).join(",")).join(",");

/** Vrátí MIME typ souboru, pokud obsah odpovídá povolenému typu a příponě. */
export function detectMime(filename: string, data: Buffer, allowed: "image" | "attachment") {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const sig = SIGNATURES.find((s) => s.ext.includes(ext) && s.check(data));
  if (!sig) return null;
  if (allowed === "image" && !sig.mime.startsWith("image/")) return null;
  return sig.mime;
}

export function safeFilename(name: string) {
  const cleaned = name.normalize("NFC").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim();
  return cleaned.slice(-120) || "soubor";
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} kB`;
  return `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
