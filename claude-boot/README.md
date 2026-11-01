# claude-boot: startovací prompty projektů pro cloud session

Když se z telefonu spustí Claude Code cloud session, SessionStart hook do ní automaticky vloží
instrukce daného projektu. Session si pak přes konektor **Most** načte `CLAUDE.md` z Obsidian
vaultu a řídí se jím, upraveným pro cloud.

```
claude-boot/
├── session-start.sh      ← hook: určí projekt a vypíše prompt
└── prompts/
    ├── _spolecne.md      ← společná pravidla (načtení vaultu, co v cloudu neplatí, kam ukládat)
    ├── lumir.md
    ├── packlabs.md
    ├── ecoclaude.md
    └── dreamy.md
```

## Jak se určí projekt

1. **Proměnná `MOST_VAULT`** v cloud environmentu (`lumir`, `packlabs`, `ecoclaude` nebo `dreamy`).
   Pro každý projekt si založ environment (např. „Dreamy“ s `MOST_VAULT=dreamy`) a v telefonu
   ho vyber při spuštění session. Funguje s jakýmkoli repozitářem.
2. **Název repozitáře:** `Dreamy`, `dreamy-landings` → dreamy, `packlabs-web` → packlabs,
   `lumirapp`, `Lumir_tracker`, `Lumir_network` → lumir.
3. Jinak stačí v první zprávě napsat „projekt dreamy“ a session si prompt načte sama.

## Instalace do dalšího repozitáře

1. Zkopíruj složku `claude-boot/`.
2. Do `.claude/settings.json` v tom repu přidej:
   ```json
   { "hooks": { "SessionStart": [ { "hooks": [ { "type": "command",
     "command": "bash \"$CLAUDE_PROJECT_DIR/claude-boot/session-start.sh\"" } ] } ] } }
   ```
3. Hook platí pro nové session, jakmile je změna na výchozí větvi repozitáře.

## Údržba

Prompty obsahují jen cloudové výjimky a nejtvrdší pravidla. Hlavní zdroj pravdy zůstává
`CLAUDE.md` ve vaultu, který se při každé session čte čerstvý. Když přibude nové zásadní
pravidlo (zákaz, schvalování), doplň ho i do příslušného promptu.
