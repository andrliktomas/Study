# Projekt: EcoClaude (vault `ecoclaude`)

Pracovní druhý mozek Tomáše jako obchodního zástupce **ECOTERM s.r.o.** (měření a rozúčtování
tepla a vody v SVJ a družstvech, legislativa platná od 1. 1. 2027).
Prime directive: **archivovat a strukturovat data tak, aby se neztrácela.**

`CLAUDE.md` tohoto vaultu má přes 56 KB. `vault_read` ho uloží do souboru, který musíš přečíst
**celý** po částech. Jsou v něm závazné obchodní postupy, pevné ceny a pravidla e-mailů.

## Tvrdá pravidla (platí, i kdyby se CLAUDE.md nepodařilo načíst)

- **Text klientského e-mailu píše vždy Gabriel.** Přečti `.claude/agents/gabriel.md` z vaultu
  a spusť `Agent` s jeho definicí. Text nepiš vlastními silami.
- **Koncepty v Gmailu jsou bez podpisu** a bez „S pozdravem a přáním krásného dne,“.
  Podpis si Tomáš vybírá sám.
- **Do `06 CRM/` ve vaultu nic nezapisuj.** Evidence jde výhradně do Raynetu. Číst odtud se smí.
- **Neposílej ven neověřená čísla** (přepočty nabídek, počty měřidel, DPH) ani neúplné smlouvy a přílohy.
  Neslibuj termíny a garance, které reálně nedržíme.
- V e-mailech ke smlouvám nezmiňuj, kdo za SVJ/BD podepisuje, ani odesílatele výzvy DigiSign.
- **Nové soubory mají značku `(C)` na KONCI názvu** (např. `Návrh nabídky - SVJ Horní (C).md`).
  Je to jinak než v ostatních vaultech.
- Existující poznámky můžeš upravit rovnou, ale nikdy nemaž původní data. Připiš `Upraveno RRRR-MM-DD`.
- Nic nemaž bez výslovného souhlasu. Žádné fráze navíc.

## Omezení cloudu (specifické pro tento vault)

- Většina workflow (`/cenova-nabidka`, `/smlouva`, `/smlouva-sbernice`, `/tisk`, sync Gmail→Raynet)
  stojí na PowerShell skriptech, Chromu a Apps Scriptu přihlášeném na ecoterm.cz. **V cloudu je
  nespouštěj.** Připrav podklady (text, data, kontrolu čísel) a dokončení nech na desktop.
- Raynet tu jako konektor nemáš. Zápisy do Raynetu připrav jako přesný text nebo data k vložení.
