# Lektorium – platforma pro online lektory jazyků

Lektoři si založí profil, pozvou studenty, prodávají balíčky lekcí a studenti si sami rezervují termíny.
**Z lekcí si platforma nebere žádnou provizi** – lektoři platí měsíční předplatné podle počtu aktivních studentů.

## Obchodní model

| Tarif     | Cena / měsíc | Aktivních studentů |
|-----------|-------------:|-------------------:|
| Zdarma    |         0 Kč |                  3 |
| Start     |       249 Kč |                 10 |
| Profi     |       499 Kč |                 25 |
| Neomezeně |       899 Kč |         neomezeně  |

Ceny a limity se mění na jednom místě: `src/lib/plans.ts` (po změně cen spusťte `npm run stripe:setup`).
Aktivní student = student, kterého lektor nemá v archivu. Při plné kapacitě se k lektorovi nemohou zapsat noví studenti
(pozvánky, nákup z veřejného profilu); stávající studenti fungují dál.

Platby studentů jdou **přímo lektorovi**: kartou na jeho vlastní Stripe účet (Connect Standard – poplatky Stripe platí lektor)
nebo převodem s QR kódem (SPAYD) na jeho bankovní účet, kdy lektor platbu jedním klikem potvrdí.

## Funkce

- **Účty**: registrace s ověřením e-mailu, přihlášení přes Google (s ochranou proti převzetí účtu), reset a změna hesla,
  profilová fotka, export dat (GDPR) a smazání účtu, omezení počtu pokusů (rate limiting)
- **Lektor**: veřejný SEO profil, balíčky (zkušební lekce, platnost balíčku), týdenní dostupnost, pozvánky, archiv studentů,
  karta studenta (zbývající lekce, nákupy, poznámky, vrácení peněz za nevyčerpané lekce, ruční připsání lekcí),
  záznam z lekce (téma, poznámky, úkol), přesun a rušení lekcí i celých sérií, přehled plateb, předplatné a fakturační údaje
- **Student**: nákup kartou nebo QR převodem, rezervace jednotlivých i pravidelných (týdenních) lekcí, přesun a storno ve lhůtě,
  historie lekcí s poznámkami a úkoly, hodnocení lektora
- **Zprávy**: konverzace lektor ↔ student s přílohami (PDF, Office, obrázky, audio do 5 MB, ověření typu podle obsahu),
  přehled sdílených materiálů, e-mailové upozornění
- **Kalendář**: Google Kalendář lektora (obsazené časy se skryjí, lekce se zapíší s Google Meet), `.ics` pozvánky
  pro studenty (potvrzení, přesun, zrušení), připomínky 24 h předem
- **Administrace** (`/admin`): MRR, rozložení tarifů, lektoři na limitu, problémy s platbou, pozastavení lektorů,
  moderace hodnocení, správa adminů, přehled plateb za lekce, export podkladů pro **DAC7**
- **SEO**: statické/ISR veřejné stránky, metadata, kanonické URL, `sitemap.xml`, `robots.txt`, JSON-LD
  (Organization, WebSite, Person, Course + AggregateRating, FAQPage, BreadcrumbList, BlogPosting), landing stránky jazyků,
  blog v Markdownu (`content/blog/*.md`), generované OG obrázky, Plausible (bez cookies) a ověření Google Search Console

## Stack

Next.js 15 (App Router, server actions) · React 19 · TypeScript · Tailwind CSS · Prisma + PostgreSQL · NextAuth ·
Stripe (Billing + Connect Standard) · Google Calendar API · Playwright

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

Bez Stripe klíče se ve vývoji platby kartou i předplatné **simulují**. Bez SMTP se e-maily (ověření e-mailu, pozvánky,
reset hesla, potvrzení) vypisují do konzole serveru.

## Testy

```bash
npm run test:unit             # bankovní účty a QR, tarify, soubory, .ics
npm run test:integration      # souběžné rezervace proti databázi (DATABASE_URL = testovací DB!)
npm run build && npm run test:e2e   # Playwright: celý příběh lektora a studenta, SEO, admin
```

E2E testy si samy připraví databázi `E2E_DATABASE_URL` (výchozí `lektorium_e2e`) a e-maily čtou z `MAIL_OUTBOX_DIR`.
Vlastní Chromium lze předat přes `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Vše běží v GitHub Actions (`.github/workflows/ci.yml`).

## Konfigurace pro produkci

1. **Databáze** – PostgreSQL (Neon, Supabase, Railway…), `DATABASE_URL`. Migrace: `npm run db:deploy`
   (na Vercelu to dělá skript `vercel-build`).
2. **Google** – OAuth klient (Web), redirect URI `https://VASE-DOMENA/api/auth/callback/google`, povolit *Google Calendar API*.
   Scopy `calendar.events` a `calendar.freebusy` jsou citlivé → pro veřejný provoz je nutné ověření aplikace Googlem (počítejte s týdny).
3. **Stripe**
   - `STRIPE_SECRET_KEY`, pak `npm run stripe:setup` (vytvoří produkt a ceny tarifů podle `src/lib/plans.ts`).
   - Zapněte **Connect** (Standard účty) a **Customer portal** (v portálu vypněte změnu tarifu – tarify se mění v aplikaci).
   - Webhook účtu platformy → `https://VASE-DOMENA/api/stripe/webhook`: `checkout.session.completed`,
     `customer.subscription.created|updated|deleted` → `STRIPE_WEBHOOK_SECRET`.
   - Webhook připojených účtů („Listen to events on Connected accounts“) → `https://VASE-DOMENA/api/stripe/connect-webhook`:
     `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `charge.refunded`,
     `account.updated` → `STRIPE_CONNECT_WEBHOOK_SECRET`.
   - V nastavení Stripe vyplňte údaje firmy pro faktury (IČO/DIČ) – faktury za předplatné vystavuje Stripe.
4. **E-maily** – SMTP (`SMTP_HOST`, …), např. Resend, Postmark, Mailgun. Nastavte SPF/DKIM pro doménu odesílatele.
5. `NEXT_PUBLIC_SITE_URL` a `NEXTAUTH_URL` = produkční doména.
6. **Provozovatel** – `OPERATOR_NAME`, `OPERATOR_ID`, `OPERATOR_ADDRESS`, `OPERATOR_EMAIL` (obchodní podmínky, GDPR).
7. **Připomínky lekcí** – `CRON_SECRET`. Hodinový cron běží přes GitHub Actions (`.github/workflows/reminders.yml`):
   v repozitáři nastavte proměnnou `SITE_URL` a tajemství `CRON_SECRET`. (Vercel cron na bezplatném tarifu běží jen jednou denně.)
8. **Analytika** (nepovinné) – `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`.

## Před spuštěním – právní a daňové věci

- Obchodní podmínky a zásady ochrany osobních údajů jsou **šablony** – nechte je zkontrolovat právníkem.
- **DAC7**: provozovatel platformy pro osobní služby může mít povinnost hlásit údaje o lektorech a jejich příjmech.
  Aplikace sbírá potřebné údaje (Předplatné → Fakturační a daňové údaje) a admin má CSV export (`/admin/lektori`).
  Formát a rozsah hlášení ověřte s daňovým poradcem.
- **DPH** z předplatného – řeší se podle toho, zda je provozovatel plátce (Stripe Tax lze zapnout v nastavení Stripe).

## Struktura

```
prisma/schema.prisma       datový model, prisma/migrations – verzované migrace
content/blog/              články blogu (Markdown s frontmatterem)
src/app/                   stránky (veřejné SEO stránky, /dashboard, /admin, auth)
src/app/actions/           server actions (auth, účet, předplatné, lektor, student, zprávy, admin)
src/app/api/               NextAuth, Stripe webhooky, soubory, export dat, DAC7, cron připomínek
src/lib/                   plans (tarify), booking (rezervace v transakci), slots, credits, bank (IBAN/QR),
                           purchases, subscription, files, rate-limit, google-calendar, ics, blog, og
tests/                     unit, integration (Postgres), e2e (Playwright)
```
