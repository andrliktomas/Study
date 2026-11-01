import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { E2E_DATABASE_URL, MAIL_OUTBOX_DIR } from "../../playwright.config";

export const db = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });

export const unique = (name: string) => `${name}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@example.com`;

type Mail = { to: string; subject: string; text: string };

/** Poslední e-mail pro adresu z testovací „pošty“ (MAIL_OUTBOX_DIR). */
export async function lastMail(to: string, subject?: RegExp): Promise<Mail> {
  let found: Mail | undefined;
  await expect
    .poll(
      () => {
        const files = (() => {
          try {
            return readdirSync(MAIL_OUTBOX_DIR).sort();
          } catch {
            return [];
          }
        })();
        const mails = files.map((f) => JSON.parse(readFileSync(path.join(MAIL_OUTBOX_DIR, f), "utf8")) as Mail);
        found = mails.filter((m) => m.to === to && (!subject || subject.test(m.subject))).pop();
        return Boolean(found);
      },
      { message: `e-mail pro ${to}` },
    )
    .toBe(true);
  return found!;
}

/** Odkaz z e-mailu převedený na cestu (server může mít v odkazech jinou doménu než testy). */
export function linkFrom(mail: Mail, pathPrefix: string) {
  const url = mail.text.match(/https?:\/\/\S+/g)?.find((u) => new URL(u).pathname.startsWith(pathPrefix));
  if (!url) throw new Error(`V e-mailu „${mail.subject}“ chybí odkaz ${pathPrefix}`);
  const u = new URL(url);
  return u.pathname + u.search;
}

export async function login(page: Page, email: string, password = "heslo1234") {
  await page.goto("/prihlaseni");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("main button[type=submit]");
  await page.waitForURL((u) => !u.pathname.startsWith("/prihlaseni"));
}

/** Zaregistruje a ověří uživatele přes UI; vrací stránku přihlášenou na callbackUrl. */
export async function registerAndVerify(page: Page, opts: { name: string; email: string; role: "tutor" | "student"; password?: string; from?: string }) {
  const password = opts.password ?? "tajneheslo1";
  if (!opts.from) await page.goto(`/registrace?role=${opts.role}`);
  await page.fill("#name", opts.name);
  await page.fill("#email", opts.email);
  await page.fill("#password", password);
  await page.check("input[name=terms]");
  await page.click("main button[type=submit]");
  await expect(page.getByText("Zkontrolujte e-mail")).toBeVisible();

  const mail = await lastMail(opts.email, /potvrďte/);
  await page.goto(linkFrom(mail, "/overeni-emailu/"));
  await expect(page.getByText("E-mail je ověřený")).toBeVisible();
  await expect(page.locator("#email")).toHaveValue(opts.email);
  await page.fill("#password", password);
  await page.click("main button[type=submit]");
  await page.waitForURL((u) => !u.pathname.startsWith("/prihlaseni"));
  return password;
}

export const creditsOf = (page: Page) => page.locator("[role=progressbar]").first().getAttribute("aria-valuenow");

// 1×1 PNG a minimální PDF pro testy nahrávání
export const PNG_1PX = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
export const PDF_MINI = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
