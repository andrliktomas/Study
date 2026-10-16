import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

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

export async function sendMail(opts: { to: string; subject: string; text: string; html?: string }) {
  const t = getTransporter();
  if (!t) {
    console.info(`\n[mail] SMTP není nastaveno – e-mail by šel na ${opts.to}\nPředmět: ${opts.subject}\n${opts.text}\n`);
    return { delivered: false };
  }
  await t.sendMail({ from: process.env.MAIL_FROM, ...opts });
  return { delivered: true };
}
