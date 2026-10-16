# Lektorium – platforma pro online lektory jazyků

Lektoři si zdarma založí profil, pozvou studenty, prodávají balíčky lekcí a studenti si sami rezervují termíny.
Platforma si bere jen provizi z prodaných lekcí (Stripe Connect – `application_fee`).

## Funkce

- **Účty**: registrace e-mailem/heslem nebo přes Google, zapomenuté heslo (odkaz e-mailem), změna hesla
- **Lektor**: veřejný SEO profil, balíčky (vč. zkušební lekce), týdenní dostupnost, pozvánky studentů,
  karta studenta (zbývající lekce, nákupy, soukromé poznámky), záznam z každé lekce (téma, poznámky, úkol),
  přehled tržeb a provizí, napojení Stripe a Google Kalendáře
- **Student**: nákup lekcí kartou, výběr volného termínu, zbývající lekce, storno ve lhůtě, historie lekcí s poznámkami a úkoly
- **Google Kalendář**: obsazené časy lektora se skryjí (freeBusy), rezervace se zapíše do kalendáře s Google Meet a pozvánkou pro studenta
- **SEO**: SSR, metadata + Open Graph, kanonické URL, `sitemap.xml`, `robots.txt`, JSON-LD (Organization, WebSite, Person + Offer, FAQPage, BreadcrumbList), landing stránky pro každý jazyk (`/jazyky/anglictina`…)

## Stack

Next.js 14 (App Router, server actions) · TypeScript · Tailwind CSS · Prisma · NextAuth · Stripe Connect · Google Calendar API

## Spuštění lokálně

```bash
cp .env.example .env      # vyplňte NEXTAUTH_SECRET (openssl rand -base64 32)
npm install
npm run db:push           # vytvoří SQLite databázi
npm run db:seed           # ukázková data (heslo: heslo1234)
npm run dev
```

Testovací účty: `lektor@example.com`, `lektor2@example.com`, `student@example.com` (heslo `heslo1234`).

Bez Stripe klíče se v developmentu platby **simulují** (lekce se připíší hned). Bez SMTP se e-maily (pozvánky, reset hesla) vypisují do konzole a odkaz na pozvánku se zobrazí lektorovi.

## Konfigurace pro produkci

1. **Databáze** – v `prisma/schema.prisma` změňte `provider` na `"postgresql"` a nastavte `DATABASE_URL` (např. Neon, Supabase, Railway).
2. **Google** – v Google Cloud Console vytvořte OAuth klienta (Web), redirect URI `https://VASE-DOMENA/api/auth/callback/google`,
   povolte *Google Calendar API*. Scopy `calendar.events` a `calendar.freebusy` jsou citlivé → pro veřejný provoz je potřeba ověření aplikace Googlem.
3. **Stripe** – zapněte Connect (Express účty), nastavte `STRIPE_SECRET_KEY`, webhook na `https://VASE-DOMENA/api/stripe/webhook`
   s událostmi `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `charge.refunded`, `account.updated`
   (u `account.updated` zaškrtněte „Listen to events on Connected accounts“) a jeho `STRIPE_WEBHOOK_SECRET`.
4. **Provize** – `PLATFORM_FEE_PERCENT` (výchozí 10).
5. **E-maily** – SMTP (`SMTP_HOST`, …), např. Resend, Postmark, Mailgun.
6. `NEXT_PUBLIC_SITE_URL` a `NEXTAUTH_URL` nastavte na produkční doménu.

Nasazení: nejjednodušší je Vercel (+ Postgres), funguje ale jakýkoli Node hosting (`npm run build && npm start`).

## Struktura

```
prisma/schema.prisma     datový model (uživatelé, profily, balíčky, nákupy, lekce, dostupnost, pozvánky)
src/app/                 stránky (veřejné SEO stránky, /dashboard, auth)
src/app/actions/         server actions (auth, lektor, student)
src/app/api/             NextAuth + Stripe webhook
src/lib/                 auth, db, stripe, google-calendar, slots (volné termíny), credits (zbývající lekce)
```
