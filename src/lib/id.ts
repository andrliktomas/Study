import { randomBytes } from "crypto";

/** Krátké náhodné ID (např. pro série lekcí). */
export function createId() {
  return randomBytes(12).toString("base64url");
}
