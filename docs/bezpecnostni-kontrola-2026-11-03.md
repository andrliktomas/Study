# Bezpečnostní kontrola před spuštěním (LK-08) – 2026-11-03

Rozsah: server actions (`src/app/actions/*`), API (`src/app/api/*`), middleware, přihlášení (NextAuth, JWT),
stránky s ID v adrese (`/dashboard/**/[id]`, `/admin/**`), nahrávání souborů, rate limiting, cron.

## Nálezy a opravy

| # | Závažnost | Nález | Oprava |
|---|---|---|---|
| 1 | 🔴 vysoká | **Stránky administrace kontrolovaly roli jen v layoutu.** Next.js při klientské navigaci layout znovu nevykoná a požadavek na samotný segment stránky jde vyvolat ručně, takže přihlášený neadmin mohl získat obsah `/admin/*` (MRR, faktury, údaje lektorů pro DAC7). Middleware ověřuje jen přihlášení, ne roli. | `requireAdmin()` v každé stránce administrace (layout kontrolu ponechává). |
| 2 | 🟠 střední | **Smazaný účet zůstal přihlášený.** Relace jsou JWT, po smazání účtu token dál platil a `getCurrentUser` vracel anonymizovaného uživatele (včetně přístupu k přílohám jeho konverzací). | `getCurrentUser` odmítá `deletedAt`; smazání účtu odhlásí na serveru (smaže cookie). |
| 3 | 🟠 střední | **Změna ani reset hesla neodhlásily ostatní zařízení.** Ukradený nebo zapomenutý přihlášený prohlížeč zůstal přihlášený napořád. | Nový sloupec `User.sessionVersion` uložený v JWT; reset hesla, změna hesla a smazání účtu ho zvýší → starší přihlášení přestanou platit. Změna hesla odhlásí i aktuální prohlížeč a přesměruje na přihlášení. API routy (`/api/soubory`, `/api/me/export`, `/api/admin/dac7`) i stránky přihlášení/registrace nově používají `getCurrentUser`, takže starý token nikam nepustí. |
| 4 | 🟠 střední | **Obejití limitu tarifu přes pozvánku.** Přijetí pozvánky vrátilo archivovaného studenta z archivu bez kontroly kapacity (lektor mohl archivovat a znovu pozvat studenty nad limit). | Návrat z archivu přes pozvánku jde přes stejnou serializovanou kontrolu kapacity jako nový student. |
| 5 | 🟡 nízká | **Přijatou pozvánku šlo použít znovu** (přeposlaný odkaz → kdokoli s účtem se zapsal k lektorovi). | Přijatý odkaz smí znovu otevřít jen ten, kdo už je zapsaný; přijetí je atomické. |
| 6 | 🟡 nízká | **Dvojí odeslání „Vrátit peníze“** mohlo souběžně vrátit stejné lekce dvakrát. | Podmíněný zápis na původní stav (`updateMany` s `refundedLessons`/`refundedCents`). |
| 7 | 🟡 nízká | Smazání účtu nemělo limit pokusů o heslo. | Rate limit 5/h. |
| 8 | ⚪ info | `CRON_SECRET` se porovnával běžným `!==`. | Porovnání v konstantním čase. |

## Zkontrolováno bez nálezu

- Server actions lektora i studenta filtrují podle vlastníka (`tutorId: profile.id` / `studentId: user.id`) – IDOR na lekce, nákupy, balíčky, pozvánky, poznámky nenalezen.
- Stránky `/dashboard/studenti/[id]`, `/dashboard/lektor/[id]`, `/platba/[id]`, `/faktura/[id]`, `/zpravy/[id]` ověřují vlastnictví.
- Přílohy: typ podle obsahu (magic bytes), limit 4 MB, `Content-Security-Policy: sandbox`, `nosniff`, přístup jen účastníkům konverzace.
- Přihlášení: rate limit podle e-mailu i IP, ověření e-mailu, ochrana proti „pre-hijackingu“ při propojení s Googlem, open-redirect ochrana `callbackUrl`.
- Rezervace a fakturace v serializovatelných transakcích (pokryto integračními testy).
- Zod validace vstupů, neznámá pole se zahazují.

## Doporučení na později

- **Content-Security-Policy** pro celý web (zatím jen `nosniff`, `X-Frame-Options`, `Referrer-Policy`).
- Role v JWT se obnovuje jen při přihlášení – všechna oprávnění se ale ověřují proti DB, takže jde jen o zobrazení.
- Export DAC7 obsahuje rodná data a IBANy – stahovat jen na zabezpečeném zařízení, neukládat do sdílených složek.
- Přílohy v Postgresu: při růstu přesun do objektového úložiště (R2 / Vercel Blob) s podepsanými URL.
