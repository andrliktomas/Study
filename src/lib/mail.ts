import { mkdir, writeFile } from "fs/promises";
import path from "path";
import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  return transporter;
}

export type MailAttachment = { filename: string; content: string; contentType?: string };
type Mail = { to: string; subject: string; text: string; html?: string; attachments?: MailAttachment[] };

export const mailConfigured = Boolean(process.env.SMTP_HOST);

export async function sendMail(opts: Mail) {
  const t = getTransporter();
  if (!t) {
    console.info(`\n[mail] SMTP není nastaveno – e-mail by šel na ${opts.to}\nPředmět: ${opts.subject}\n${opts.text}\n`);
    // Pro automatické testy: MAIL_OUTBOX_DIR=… uloží každý e-mail jako JSON soubor.
    if (process.env.MAIL_OUTBOX_DIR) {
      await mkdir(process.env.MAIL_OUTBOX_DIR, { recursive: true });
      const file = path.join(process.env.MAIL_OUTBOX_DIR, `${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
      await writeFile(file, JSON.stringify({ to: opts.to, subject: opts.subject, text: opts.text }));
    }
    return { delivered: false };
  }
  await t.sendMail({ from: process.env.MAIL_FROM, ...opts });
  return { delivered: true };
}
