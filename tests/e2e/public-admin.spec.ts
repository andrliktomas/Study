import { expect, test } from "@playwright/test";
import { db, login, registerAndVerify, unique } from "./helpers";

test.afterAll(async () => {
  await db.$disconnect();
});

test("veřejné stránky se načtou a jsou cachovatelné", async ({ page, request }) => {
  for (const [path, heading] of [
    ["/", /bez chaosu/],
    ["/lektori", /Online lektoři jazyků/],
    ["/cenik", /Platíte podle počtu studentů/],
    ["/pro-lektory", /Celá vaše výuka/],
    ["/jazyky/anglictina", /Online lektor angličtiny/],
    ["/blog", /Blog/],
    ["/obchodni-podminky", /Obchodní podmínky/],
  ] as const) {
    await page.goto(path);
    await expect(page.locator("h1").first()).toHaveText(heading);
  }
  // úvodní stránka je statická (ISR) – CDN ji smí cachovat
  const home = await request.get("/");
  expect(home.headers()["cache-control"]).toContain("s-maxage");
});

test("profil lektora: hodnocení a strukturovaná data pro Google", async ({ page }) => {
  await page.goto("/lektori/jana-novakova");
  await expect(page.getByText("Hodnocení studentů")).toBeVisible();
  const graphs = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t));
  const course = graphs.flatMap((g) => g["@graph"] ?? [g]).find((n) => n["@type"] === "Course");
  expect(course).toBeTruthy();
  expect(course.aggregateRating.ratingValue).toBe("5.0");
  expect(course.offers.length).toBeGreaterThan(0);
});

test("katalog filtruje podle jazyka", async ({ page }) => {
  await page.goto("/lektori?jazyk=de");
  await expect(page.getByText("Martin Svoboda")).toBeVisible();
  await expect(page.getByText("Jana Nováková")).toHaveCount(0);
});

test("OG obrázky, sitemap a robots", async ({ request }) => {
  for (const url of ["/opengraph-image", "/lektori/jana-novakova/opengraph-image"]) {
    const res = await request.get(url);
    expect(res.status(), url).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
  }
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/lektori/jana-novakova");
  expect(sitemap).toContain("/blog/");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /dashboard");
});

test("blog: článek s daty pro Google", async ({ page }) => {
  await page.goto("/blog");
  await page.locator("main a[href^='/blog/']").first().click();
  await expect(page.locator("article h1")).toBeVisible();
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.some((t) => t.includes('"BlogPosting"'))).toBe(true);
});

test("přihlášení: omezení počtu pokusů", async ({ page }) => {
  const email = unique("zamek");
  await page.goto("/prihlaseni");
  for (let i = 0; i < 11; i++) {
    await page.fill("#email", email);
    await page.fill("#password", `spatne-${i}`);
    await page.click("main button[type=submit]");
    await expect(page.locator("main [role=alert]")).toBeVisible();
  }
  await expect(page.getByText("Příliš mnoho pokusů")).toBeVisible();
});

test("chráněné stránky vyžadují přihlášení a roli", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/prihlaseni/);
  await login(page, "student@example.com");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("administrace: MRR, lektoři a export DAC7", async ({ page }) => {
  await login(page, "admin@example.com");
  await page.goto("/admin");
  await expect(page.getByText("MRR (měsíční příjem)")).toBeVisible();
  // Jana má v seedu tarif Start
  await expect(page.getByText("249 Kč").first()).toBeVisible();
  await page.goto("/admin/lektori");
  await expect(page.getByRole("cell", { name: /Jana Nováková/ })).toBeVisible();
  const csv = await page.request.get(`/api/admin/dac7?rok=${new Date().getFullYear()}`);
  expect(csv.status()).toBe(200);
  const body = await csv.text();
  expect(body).toContain("lektor_id;jmeno_nazev");
  expect(body).toContain("Jana Nováková");

  await page.goto("/admin/fakturace?f=zaplacene");
  await expect(page.getByText(`${new Date().getFullYear()}0001`)).toBeVisible();

  const forbidden = await (await page.context().browser()!.newContext()).request.get("/api/admin/dac7");
  expect(forbidden.status()).toBe(403);
});

test("cron připomínek vyžaduje tajný klíč", async ({ request }) => {
  expect((await request.get("/api/cron/reminders")).status()).toBe(401);
  const ok = await request.get("/api/cron/reminders", { headers: { Authorization: "Bearer e2e-cron" } });
  expect(ok.status()).toBe(200);
  expect(await ok.json()).toHaveProperty("sent");
});

test("změna hesla odhlásí všechna zařízení", async ({ browser }) => {
  const email = unique("heslo");
  const first = await (await browser.newContext()).newPage();
  const password = await registerAndVerify(first, { name: "Hana Heslová", email, role: "student" });
  const second = await (await browser.newContext()).newPage();
  await login(second, email, password);
  await second.goto("/dashboard");
  await expect(second).toHaveURL(/\/dashboard/);

  await first.goto("/dashboard/nastaveni");
  await first.fill("#pw-current", password);
  await first.fill("#pw-new", "noveheslo123");
  await first.fill("#pw-confirm", "noveheslo123");
  await first.locator("form:has(#pw-new) button[type=submit]").click();
  await first.waitForURL("**/prihlaseni?heslo=zmeneno");
  await expect(first.getByText("Heslo je změněné")).toBeVisible();

  // druhé zařízení se starým přihlášením už do přehledu nesmí
  await second.goto("/dashboard");
  await expect(second).toHaveURL(/\/prihlaseni/);
  await login(second, email, "noveheslo123");
  await expect(second).toHaveURL(/\/dashboard/);
});

test("lektor si stáhne studenty, lekce a platby do tabulky", async ({ page, browser }) => {
  await login(page, "lektor@example.com");
  await page.goto("/dashboard/studenti");
  await expect(page.getByRole("heading", { name: "Export do tabulky" })).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent("download"), page.locator(`a[href="/api/lektor/export?co=studenti"]`).click()]);
  expect(download.suggestedFilename()).toMatch(/^lektorium-studenti-\d{4}-\d{2}-\d{2}\.csv$/);

  for (const co of ["studenti", "lekce", "platby"]) {
    const res = await page.request.get(`/api/lektor/export?co=${co}`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/csv");
    const text = await res.text();
    expect(text.startsWith("﻿")).toBe(true);
  }
  const students = await (await page.request.get("/api/lektor/export?co=studenti")).text();
  expect(students).toContain("Jméno;E-mail;Zbývající lekce;Délka lekce (min);Poznámka");
  expect(students).toContain("student@example.com");
  expect((await page.request.get("/api/lektor/export?co=neco")).status()).toBe(400);

  // student ani nepřihlášený export nedostanou
  const studentPage = await (await browser.newContext()).newPage();
  await login(studentPage, "student@example.com");
  expect((await studentPage.request.get("/api/lektor/export?co=studenti")).status()).toBe(403);
  expect((await (await browser.newContext()).request.get("/api/lektor/export?co=studenti")).status()).toBe(401);
});
