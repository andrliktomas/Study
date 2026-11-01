import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { PDF_MINI, PNG_1PX, creditsOf, db, lastMail, linkFrom, login, registerAndVerify, unique } from "./helpers";

// Celý příběh lektora a studenta – testy navazují, proto běží sériově.
test.describe.configure({ mode: "serial" });

const tutorEmail = unique("eva");
const studentEmail = unique("tomas");
let tutorCtx: BrowserContext, studentCtx: BrowserContext;
let tutor: Page, student: Page;
let studentPassword = "";

async function newPage(browser: Browser) {
  const ctx = await browser.newContext();
  return { ctx, page: await ctx.newPage() };
}

test.beforeAll(async ({ browser }) => {
  ({ ctx: tutorCtx, page: tutor } = await newPage(browser));
  ({ ctx: studentCtx, page: student } = await newPage(browser));
});
test.afterAll(async () => {
  await tutorCtx.close();
  await studentCtx.close();
});

test("lektor se zaregistruje; bez ověření e-mailu se nepřihlásí", async () => {
  await tutor.goto("/registrace?role=tutor");
  await tutor.fill("#name", "Eva Testová");
  await tutor.fill("#email", tutorEmail);
  await tutor.fill("#password", "tajneheslo1");
  await tutor.check("input[name=terms]");
  await tutor.click("main button[type=submit]");
  await expect(tutor.getByText("Zkontrolujte e-mail")).toBeVisible();

  // přihlášení před ověřením selže a nabídne nový odkaz
  await tutor.goto("/prihlaseni");
  await tutor.fill("#email", tutorEmail);
  await tutor.fill("#password", "tajneheslo1");
  await tutor.click("main button[type=submit]");
  await expect(tutor.getByText("Nejdřív prosím potvrďte svůj e-mail")).toBeVisible();

  const mail = await lastMail(tutorEmail, /potvrďte/);
  await tutor.goto(linkFrom(mail, "/overeni-emailu/"));
  await tutor.fill("#password", "tajneheslo1");
  await tutor.click("main button[type=submit]");
  await tutor.waitForURL("**/dashboard/profil");
});

test("lektor nastaví profil, balíček, rozvrh, účet a fotku a zveřejní se", async () => {
  await tutor.goto("/dashboard/balicky");
  await tutor.fill("#name-new", "Balíček 5 lekcí");
  await tutor.fill("#price-new", "2000");
  await tutor.selectOption("#valid-new", "90");
  await tutor.click("text=Přidat balíček");
  await expect(tutor.getByText("Balíček uložen")).toBeVisible();

  await tutor.goto("/dashboard/dostupnost");
  const adds = tutor.locator("text=+ Přidat blok");
  for (let i = 0; i < 7; i++) await adds.nth(i).click();
  await tutor.click("text=Uložit dostupnost");
  await expect(tutor.getByText("Dostupnost uložena")).toBeVisible();

  await tutor.goto("/dashboard/platby");
  await tutor.fill("#account", "1234/0800");
  await tutor.click("text=Uložit účet");
  await expect(tutor.getByText("Neplatné číslo účtu")).toBeVisible();
  await tutor.fill("#account", "19-2000145399/0800");
  await tutor.click("text=Uložit účet");
  await expect(tutor.getByText("Studenti teď mohou platit převodem")).toBeVisible();

  await tutor.goto("/dashboard/nastaveni");
  await tutor.locator("input[type=file]").setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: PNG_1PX });
  await expect(tutor.getByText("Fotka uložena")).toBeVisible();

  await tutor.goto("/dashboard/profil");
  await tutor.fill("#headline", "Francouzština pro začátečníky");
  await tutor.fill("#bio", "Ahoj, jsem Eva a učím francouzštinu už deset let. Moje lekce jsou zábavné a praktické.");
  await tutor.click("text=Francouzština");
  await tutor.click("text=Zveřejnit profil v katalogu lektorů");
  await tutor.click("text=Uložit profil");
  await expect(tutor.getByText("Profil je uložený a zveřejněný")).toBeVisible();

  const slug = (await db.tutorProfile.findFirstOrThrow({ where: { user: { email: tutorEmail } } })).slug;
  await tutor.goto(`/lektori/${slug}`);
  await expect(tutor.getByRole("heading", { name: "Eva Testová" })).toBeVisible();
  await expect(tutor.locator("main img[alt='Eva Testová']").first()).toBeVisible();
});

test("student přijme pozvánku, zaregistruje se a ověří e-mail", async () => {
  await tutor.goto("/dashboard/studenti");
  await tutor.fill("#invite-email", studentEmail);
  await tutor.click("text=Poslat pozvánku");
  await expect(tutor.locator("form code").first()).toBeVisible();

  const invite = await lastMail(studentEmail, /zve/);
  const invitePath = linkFrom(invite, "/pozvanka/");
  await student.goto(invitePath);
  await student.click("text=Vytvořit účet a přijmout");
  await expect(student.locator("#email")).toHaveValue(studentEmail);
  studentPassword = await registerAndVerify(student, { name: "Tomáš Student", email: studentEmail, role: "student", from: invitePath });
  await student.waitForURL(`**${invitePath}`);
  await student.click("text=Přijmout pozvánku");
  await student.waitForURL("**/dashboard/lektor/**");
  await expect(student.getByText("Pozvánka přijata")).toBeVisible();
});

test("platba převodem s QR kódem a potvrzení lektorem", async () => {
  await student.click("button:has-text('Převodem (QR)')");
  await student.waitForURL("**/platba/**");
  await expect(student.locator("[aria-label='QR kód pro platbu'] svg")).toBeVisible();
  await expect(student.getByText("19-2000145399/0800").first()).toBeVisible();
  const vs = await db.purchase.findFirstOrThrow({ where: { student: { email: studentEmail }, status: "PENDING" } });
  await expect(student.getByText(vs.variableSymbol!).first()).toBeVisible();
  await student.click("text=Hotovo, zaplaceno");
  await expect(student.getByText("Čekáme na vaši platbu převodem")).toBeVisible();
  expect(await creditsOf(student)).toBe("0");

  await tutor.goto("/dashboard/platby");
  await expect(tutor.getByText(vs.variableSymbol!)).toBeVisible();
  await tutor.click("button:has-text('Platba přišla')");
  await expect(tutor.getByText("Čeká na platbu převodem")).toHaveCount(0);

  await student.reload();
  expect(await creditsOf(student)).toBe("5");
  await expect(student.getByText(/platí do \d/).first()).toBeVisible();
  await lastMail(studentEmail, /Platba přijata/);
});

test("pravidelné lekce: rezervace 3 týdnů najednou", async () => {
  await student.locator("[role=listbox][aria-label='Čas'] button").first().click();
  await student.getByLabel("Opakovat každý týden").check();
  await student.getByLabel("Počet týdnů").selectOption("3");
  await student.click("button:has-text('Rezervovat 3 lekce')");
  await expect(student.getByText("Rezervováno: 3 lekce")).toBeVisible();
  await student.reload();
  expect(await creditsOf(student)).toBe("2");
  await expect(student.getByText("↻ pravidelná")).toHaveCount(3);
  const mail = await lastMail(studentEmail, /Potvrzení pravidelných lekcí: 3×/);
  expect(mail.text).toContain("pravidelné lekce");
});

test("student přesune lekci", async () => {
  const before = await db.lesson.findFirstOrThrow({ where: { student: { email: studentEmail }, status: "SCHEDULED" }, orderBy: { startsAt: "asc" } });
  await student.locator("a:has-text('Přesunout')").first().click();
  await expect(student.getByText(/Přesunout lekci z/)).toBeVisible();
  await student.locator("[role=listbox][aria-label='Den'] button").nth(1).click();
  await student.locator("[role=listbox][aria-label='Čas'] button").last().click();
  await student.click("button:has-text('Přesunout lekci')");
  await expect(student.getByText("Lekce je přesunutá")).toBeVisible();
  const after = await db.lesson.findUniqueOrThrow({ where: { id: before.id } });
  expect(after.startsAt.getTime()).not.toBe(before.startsAt.getTime());
  expect(after.sequence).toBe(1);
});

test("student zruší celou sérii a lekce se vrátí", async () => {
  await student.locator("button:has-text('Zrušit i další')").first().click();
  await expect(student.getByText("↻ pravidelná")).toHaveCount(0);
  expect(await creditsOf(student)).toBe("5");
});

test("zprávy s přílohou mezi studentem a lektorem", async () => {
  await student.click("main a[href^='/dashboard/zpravy/']");
  await student.waitForURL("**/dashboard/zpravy/**");
  await student.fill("textarea[name=body]", "Dobrý den, posílám vyplněný úkol.");
  await student.locator("input[name=file]").setInputFiles({ name: "ukol.pdf", mimeType: "application/pdf", buffer: PDF_MINI });
  await student.click("button:has-text('Odeslat')");
  await expect(student.getByText("Dobrý den, posílám vyplněný úkol.")).toBeVisible();
  await expect(student.locator("aside").getByText("ukol.pdf")).toBeVisible();

  // podvržený soubor neprojde
  await student.locator("input[name=file]").setInputFiles({ name: "virus.pdf", mimeType: "application/pdf", buffer: Buffer.from("MZ") });
  await student.click("button:has-text('Odeslat')");
  await expect(student.getByText("Tento typ souboru nepodporujeme")).toBeVisible();

  await tutor.goto("/dashboard");
  await expect(tutor.getByLabel("1 nepřečtených")).toBeVisible();
  await tutor.goto("/dashboard/zpravy");
  await tutor.getByText("Tomáš Student").click();
  await expect(tutor.getByText("Dobrý den, posílám vyplněný úkol.")).toBeVisible();
  const href = await tutor.locator("aside a:has-text('ukol.pdf')").getAttribute("href");
  const res = await tutor.request.get(href!);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("application/pdf");
  // nepřihlášený soubor nestáhne
  const anon = await (await student.context().browser()!.newContext()).request.get(new URL(href!, tutor.url()).toString());
  expect(anon.status()).toBe(401);
  await lastMail(tutorEmail, /Nová zpráva/);
});

test("lektor vrátí peníze za nevyčerpané lekce", async () => {
  await tutor.goto("/dashboard/studenti");
  await tutor.getByText("Tomáš Student").first().click();
  await tutor.click("button:has-text('Vrátit peníze za nevyčerpané lekce (5)')");
  await tutor.click("button:has-text('Ano, vrátit')");
  await expect(tutor.getByText(/Zaznamenáno vrácení 2\s000\s*Kč/)).toBeVisible();
  const profile = await db.tutorProfile.findFirstOrThrow({ where: { user: { email: tutorEmail } } });
  await student.goto(`/dashboard/lektor/${profile.id}`);
  expect(await creditsOf(student)).toBe("0");
  await lastMail(studentEmail, /Vrácení peněz/);
});

test("limit tarifu podle počtu studentů a přechod na vyšší tarif", async () => {
  const profile = await db.tutorProfile.findFirstOrThrow({ where: { user: { email: tutorEmail } } });
  for (const name of ["Dalsi-1", "Dalsi-2"]) {
    const u = await db.user.create({ data: { email: unique(name), name, emailVerified: new Date() } });
    await db.enrollment.create({ data: { tutorId: profile.id, studentId: u.id } });
  }
  await tutor.goto("/dashboard/studenti");
  await expect(tutor.getByText("Máte plnou kapacitu tarifu")).toBeVisible();
  await expect(tutor.locator("#invite-email")).toHaveCount(0);

  // nový student se z veřejného profilu nezapíše
  const outsider = await (await tutor.context().browser()!.newContext()).newPage();
  await registerAndVerify(outsider, { name: "Zvědavec", email: unique("zvedavec"), role: "student" });
  await outsider.goto(`/lektori/${profile.slug}`);
  await outsider.click("button:has-text('Kartou')");
  await expect(outsider.getByText("nepřijímá nové studenty")).toBeVisible();

  await tutor.goto("/dashboard/predplatne");
  await expect(tutor.getByText("3 / 3")).toBeVisible();
  await tutor.locator("form:has(input[value=START]) button").click();
  await expect(tutor.getByText("Tarif byl změněn")).toBeVisible();
  await expect(tutor.getByText("3 / 10")).toBeVisible();
  // na Zdarma s více než 3 studenty přejít nejde
  await db.enrollment.create({ data: { tutorId: profile.id, studentId: (await db.user.create({ data: { email: unique("ctvrty"), name: "Čtvrtý" } })).id } });
  await tutor.reload();
  await tutor.locator("form:has(input[value=FREE]) button").click();
  await expect(tutor.getByText(/Nejdřív některé archivujte/)).toBeVisible();
});

test("student smaže účet", async () => {
  await student.goto("/dashboard/nastaveni");
  await student.fill("#del-confirm", studentEmail);
  await student.fill("#del-pw", studentPassword);
  await student.click("button:has-text('Trvale smazat účet')");
  await student.waitForURL("**/?ucet-smazan=1");
  await expect(student.getByText("Váš účet byl smazán")).toBeVisible();
  const deleted = await db.user.findFirst({ where: { email: studentEmail } });
  expect(deleted).toBeNull();

  await student.goto("/prihlaseni");
  await student.fill("#email", studentEmail);
  await student.fill("#password", studentPassword);
  await student.click("main button[type=submit]");
  await expect(student.getByText("Nesprávný e-mail nebo heslo")).toBeVisible();
});

test.afterAll(async () => {
  await db.$disconnect();
});

// Pomocná kontrola, že přihlašovací helper funguje i pro seed účty
test("seed student vidí svou historii", async ({ page }) => {
  await login(page, "student@example.com");
  await page.goto("/dashboard");
  await page.getByRole("link", { name: /Jana Nováková/ }).first().click();
  await expect(page.getByText("Past simple vs. present perfect")).toBeVisible();
});
