import { db } from "./db";
import { sendMail } from "./mail";
import { safeCallbackUrl } from "./safe-redirect";
import { absoluteUrl, site } from "./site";
import { hashToken, randomToken } from "./tokens";

export async function sendVerificationEmail(email: string, callbackUrl?: string | null) {
  const token = randomToken();
  await db.verificationToken.deleteMany({ where: { identifier: email } });
  await db.verificationToken.create({
    data: { identifier: email, token: hashToken(token), expires: new Date(Date.now() + 48 * 3600 * 1000) },
  });
  const cb = safeCallbackUrl(callbackUrl, "");
  const link = absoluteUrl(`/overeni-emailu/${token}${cb ? `?callbackUrl=${encodeURIComponent(cb)}` : ""}`);
  return sendMail({
    to: email,
    subject: `${site.name}: potvrďte svůj e-mail`,
    text: `Dobrý den,\n\ndokončete registraci kliknutím na odkaz (platí 48 hodin):\n${link}\n\nPokud jste se neregistrovali, e-mail ignorujte.`,
  });
}

/** Ověří token; vrací e-mail ověřeného uživatele nebo null. */
export async function consumeVerificationToken(token: string) {
  const record = await db.verificationToken.findUnique({ where: { token: hashToken(token) } });
  if (!record) return null;
  await db.verificationToken.delete({ where: { token: record.token } });
  if (record.expires < new Date()) return null;
  await db.user.updateMany({ where: { email: record.identifier, emailVerified: null }, data: { emailVerified: new Date() } });
  return record.identifier;
}
