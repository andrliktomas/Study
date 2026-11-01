# Lektorium – platforma pro online lektory jazyků

Lektoři si založí profil, pozvou studenty, prodávají balíčky lekcí a studenti si sami rezervují termíny.
**Z lekcí si platforma nebere žádnou provizi** – lektoři platí měsíční předplatné podle počtu aktivních studentů.
**Žádné platby kartou** – vše probíhá bankovním převodem, i mezinárodním (IBAN/SWIFT, více měn).

## Obchodní model

| Tarif     | CZK / měsíc | EUR / měsíc | Aktivních studentů |
|-----------|------------:|------------:|-------------------:|
| Zdarma    |        0 Kč |         0 € |                  3 |
| Start     |      249 Kč |      9,90 € |                 10 |
| Profi     |      499 Kč |     19,90 € |                 25 |
| Neomezeně |      899 Kč |     35,90 € |         neomezeně  |

Ceny a limity se mění na jednom místě: `src/lib/plans.ts`.
Aktivní student = student, kterého lektor nemá v archivu. Při plné kapacitě se k lektorovi nemohou zapsat noví studenti;
stávající studenti fungují dál.

**Předplatné se platí převodem na fakturu** (CZK nebo EUR podle volby lektora):
- volba placeného tarifu → faktura na měsíc s QR kódem, tarif platí hned, splatnost 14 dní;
- vyšší tarif během zaplaceného období → faktura na poměrný doplatek, tarif platí hned;
- nižší tarif / zrušení → platí od dalšího období;
- fakturu na další měsíc systém vystaví 7 dní předem (splatnost 7 dní od začátku období), 3 dny před splatností pošle upomínku;
- nezaplacená faktura po splatnosti → tarif spadne na Zdarma (po nezaplacené faktuře se další tarif aktivuje až po platbě);
- platby párujete v administraci (`/admin/fakturace`) podle variabilního symbolu = čísla faktury (např. `20260001`).

**Platby studentů jdou přímo lektorovi převodem.** Lektor si přidá bankovní účet pro každou měnu, ve které prodává
(CZK, EUR, USD, GBP, PLN, CHF): majitel, IBAN nebo číslo účtu, SWIFT/BIC, banka, poznámka (např. ABA routing).
Student uvidí všechny údaje pro (mezinárodní) převod a variabilní symbol/referenci; u CZK na český účet i **QR Platbu** (SPAYD),
u EUR **SEPA QR / GiroCode** (EPC). Lektor připsání platby potvrdí jedním klikem, nezaplacené objednávky se po 21 dnech zruší.

## Funkce

- **Účty**: registrace s ověřením e-mailu, přihlášení přes Google (s ochranou proti převzetí účtu), reset a změna hesla,
  profilová fotka, export dat (GDPR) a smazání účtu, omezení počtu pokusů (rate limiting)
- **Lektor**: veřejný SEO profil, balíčky v různých měnách (zkušební lekce, platnost balíčku), bankovní účty po měnách,
  týdenní dostupnost, pozvánky, archiv studentů,
  karta studenta (zbývající lekce, nákupy, poznámky, vrácení peněz za nevyčerpané lekce, ruční připsání lekcí),
  záznam z lekce (téma, poznámky, úkol), přesun a rušení lekcí i celých sérií, přehled plateb, předplatné a fakturační údaje
- **Student**: nákup převodem (QR, IBAN/SWIFT), rezervace jednotlivých i pravidelných (týdenních) lekcí, přesun a storno ve lhůtě,
  historie lekcí s poznámkami a úkoly, hodnocení lektora
- **Zprávy**: konverzace lektor ↔ student s přílohami (PDF, Office, obrázky, audio do 5 MB, ověření typu podle obsahu),
  přehled sdílených materiálů, e-mailové upozornění
- **Kalendář**: Google Kalendář lektora (obsazené časy se skryjí, lekce se zapíší s Google Meet), `.ics` pozvánky
  pro studenty (potvrzení, přesun, zrušení), připomínky 24 h předem
- **Administrace** (`/admin`): MRR, fakturace (párování plateb, storno, tisk faktur), rozložení tarifů, lektoři na limitu, pozastavení lektorů,
  moderace hodnocení, správa adminů, přehled plateb za lekce, export podkladů pro **DAC7**
- **SEO**: statické/ISR veřejné stránky, metadata, kanonické URL, `sitemap.xml`, `robots.txt`, JSON-LD
  (Organization, WebSite, Person, Course + AggregateRating, FAQPage, BreadcrumbList, BlogPosting), landing stránky jazyků,
  blog v Markdownu (`content/blog/*.md`), generované OG obrázky, Plausible (bez cookies) a ověření Google Search Console

## Stack

Next.js 15 (App Router, server actions) · React 19 · TypeScript · Tailwind CSS · Prisma + PostgreSQL · NextAuth ·
Google Calendar API · QR kódy (SPAYD, EPC) · Playwright

## Spuštění lokálně

```bash
docker compose up -d          # PostgreSQL 16
cp .env.example .env          # vyplňte NEXTAUTH_SECRET (openssl rand -base64 32)
npm install
npm run db:migrate            # vytvoří tabulky (prisma migrate dev)
npm run db:seed               # ukázková data (heslo: heslo1234)
npm run dev
```

Testovací účty: `lektor@example.com`, `lektor2@example.com`, `student@example.com`, `admin@example.com` (heslo `heslo1234`).
Administrátora z existujícího účtu uděláte příkazem `npm run make-admin -- email@domena.cz`.

Bez SMTP se e-maily (ověření e-mailu, pozvánky, faktury, potvrzení) vypisují do konzole serveru. Bez nastaveného účtu
provozovatele se ve vývoji na fakturách použije vzorový IBAN z dokumentace ČNB. Fakturaci (obnovy, upomínky, vypršení)
spustíte ručně: `curl -H "Authorization: Bearer dev-cron" http://localhost:3000/api/cron/reminders`.

## Testy

```bash
npm run test:unit             # IBAN/SWIFT, QR (SPAYD, EPC), tarify, soubory, .ics
npm run test:integration      # souběžné rezervace a fakturace s posunem času (DATABASE_URL = testovací DB!)
npm run build && npm run test:e2e   # Playwright: celý příběh lektora a studenta, SEO, admin
```

E2E testy si samy připraví databázi `E2E_DATABASE_URL` (výchozí `lektorium_e2e`) a e-maily čtou z `MAIL_OUTBOX_DIR`.
Vlastní Chromium lze předat přes `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Vše běží v GitHub Actions (`.github/workflows/ci.yml`).

## Konfigurace pro produkci

1. **Databáze** – PostgreSQL (Neon, Supabase, Railway…), `DATABASE_URL`. Migrace: `npm run db:deploy`
   (na Vercelu to dělá skript `vercel-build`).
2. **Google** – OAuth klient (Web), redirect URI `https://VASE-DOMENA/api/auth/callback/google`, povolit *Google Calendar API*.
   Scopy `calendar.events` a `calendar.freebusy` jsou citlivé → pro veřejný provoz je nutné ověření aplikace Googlem (počítejte s týdny).
4. **E-maily** – SMTP (`SMTP_HOST`, …), např. Resend, Postmark, Mailgun. Nastavte SPF/DKIM pro doménu odesílatele.
5. `NEXT_PUBLIC_SITE_URL` a `NEXTAUTH_URL` = produkční doména.
6. **Provozovatel a faktury** – `OPERATOR_NAME`, `OPERATOR_ID`, `OPERATOR_ADDRESS`, `OPERATOR_EMAIL`, `OPERATOR_REGISTRY`;
   bankovní účty pro předplatné `OPERATOR_IBAN_CZK` (+ `OPERATOR_BIC_CZK`) a/nebo `OPERATOR_IBAN_EUR` (+ `OPERATOR_BIC_EUR`),
   `OPERATOR_ACCOUNT_HOLDER`. Jako plátce DPH vyplňte `OPERATOR_VAT_ID` (faktury pak mají rozpis DPH, ceny v `plans.ts` jsou s DPH).
7. **Cron (připomínky lekcí + fakturace)** – `CRON_SECRET`. Hodinový cron běží přes GitHub Actions (`.github/workflows/reminders.yml`):
   v repozitáři nastavte proměnnou `SITE_URL` a tajemství `CRON_SECRET`. (Vercel cron na bezplatném tarifu běží jen jednou denně.)
8. **Analytika** (nepovinné) – `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`.

## Před spuštěním – právní a daňové věci

- Obchodní podmínky a zásady ochrany osobních údajů jsou **šablony** – nechte je zkontrolovat právníkem.
- **DAC7**: provozovatel platformy pro osobní služby může mít povinnost hlásit údaje o lektorech a jejich příjmech.
  Aplikace sbírá potřebné údaje (Předplatné → Fakturační a daňové údaje) a admin má CSV export (`/admin/lektori`).
  Formát a rozsah hlášení ověřte s daňovým poradcem.
- **DPH** z předplatného – pokud budete plátce DPH a fakturovat lektorům z jiných zemí EU (EUR), řešte s účetní přenesení
  daňové povinnosti (B2B s DIČ) a režim OSS (nepodnikatelé). Aplikace zatím počítá jednu sazbu DPH pro všechny.
- **Formát faktury** si nechte zkontrolovat účetní (náležitosti dokladu, číselná řada, archivace).

## Struktura

```
prisma/schema.prisma       datový model, prisma/migrations – verzované migrace
content/blog/              články blogu (Markdown s frontmatterem)
src/app/                   stránky (veřejné SEO stránky, /dashboard, /admin, auth)
src/app/actions/           server actions (auth, účet, předplatné, lektor, student, zprávy, admin)
src/app/api/               NextAuth, soubory, export dat, DAC7, cron (připomínky + fakturace)
src/lib/                   plans (tarify), billing (faktury, obnovy), booking (rezervace v transakci), slots, credits,
                           bank (IBAN/SWIFT, SPAYD/EPC QR), currencies, payments, purchases, files, rate-limit,
                           google-calendar, ics, blog, og
tests/                     unit, integration (Postgres), e2e (Playwright)
```
