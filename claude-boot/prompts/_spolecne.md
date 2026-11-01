# Boot: cloud session nad Obsidian vaultem (společná pravidla)

Tahle session běží v Claude Code v cloudu, typicky spuštěná z telefonu. Kontext projektu
je v Obsidian vaultu na Google Drivu a dostaneš se k němu jen přes konektor **Most**
(`mcp__Most__*`; načti ho přes ToolSearch, pokud ho nemáš).

## Start session (udělej hned, ještě před odpovědí na první zprávu)

1. Načti kontext vaultu: `vault_read(vault, "CLAUDE.md")`.
   - **Nepoužívej `vault_context`.** Padá na limit Cloudflare Workeru („Too many subrequests“).
   - Když je soubor moc velký a výsledek se uloží do souboru, přečti ten soubor celý po částech.
     Celý `CLAUDE.md` je závazný, nestačí začátek.
2. `vault_recent(vault)`: co se ve vaultu měnilo za poslední dny.
3. Pokud první zpráva míří na konkrétní projekt v `03 Projects/`, přečti i jeho `CLAUDE.md`, pokud existuje.
4. Nevypisuj shrnutí kontextu. Rovnou odpověz na zadání. Pokud zadání chybí, jednou větou řekni,
   že máš kontext načtený, a zeptej se, na čem se dělá.

## Co z vaultového CLAUDE.md v cloudu NEPLATÍ (cloud přepisuje desktop)

Vaultová pravidla jsou psaná pro desktop (Windows + Obsidian + Claudian). V cloudu:

- **Nejsou tu lokální cesty** (`G:\`, `I:\`, `C:\dev\…`), PowerShell, Chrome rozšíření
  (`switch_browser`, Claude in Chrome) ani Obsidian. Úkol, který je nutně potřebuje, nedělej
  náhradní cestou. Řekni, že musí počkat na desktop, a zapiš ho do vaultu jako úkol.
- **Agenti a skilly z vaultu (`.claude/agents`, `.claude/skills`, `.claude/commands`) se tu
  nenačítají.** Když pravidlo říká „zavolej agenta X“ nebo „použij /skill“, přečti jeho
  definici přes Most (`vault_read(vault, ".claude/agents/x.md")` nebo `.claude/skills/x/SKILL.md`)
  a postupuj podle ní. Pro samostatný běh spusť `Agent` s obsahem definice v promptu.
- **Hooky vaultu tu neběží** (časové razítko `.task-start`, injekce tonality a podobně).
- Pravidla o obsahu, tónu, klientech, schvalování a zákazech **platí beze změny**.

## Kam ukládat výstupy

- **Kód** patří do git repozitáře této session: commit a push do přidělené větve, jak říkají
  instrukce session. Do vaultu kód nedávej, kromě malých skriptů, které tam patří podle CLAUDE.md
  (např. `.gs` Apps Script u projektu).
- **Poznámky, zadání, analýzy, reporty** patří do vaultu přes Most. Nové soubory vytvářej přes
  `vault_create` a dodrž konvenci značky `(C)` z daného vaultu. Existující soubory uprav jen
  postupem `vault_read` → `vault_edit`, a jen pokud to pravidla vaultu dovolují.
- **Zápis konverzace:** `vault_journal(vault, "<předmět>")` vytvoří poznámku
  „RRRR-MM-DD - Most - <předmět>“. Myšlenky přidávej přes `vault_append` do sekce „Zápisky“
  (s časem HH:MM), úkoly do sekce „Úkoly“ jako `- [ ] …`. Jedna konverzace = jedna poznámka.
- **Nikdy nic nemaž** (`vault_delete`, mazání obsahu) bez výslovného souhlasu v této konverzaci.
- Vault je zároveň otevřený na desktopu a synchronizuje se přes Drive. Před každou úpravou
  soubor znovu načti, ať nepřepíšeš změnu z desktopu.

## Komunikace

Uživatel je na mobilu: odpovídej krátce, česky, bez velkých stromů a tabulek a s nejvýš jednou
otázkou najednou. Když je potřeba rozhodnout, doporuč jednu variantu.
