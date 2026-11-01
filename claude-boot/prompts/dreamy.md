# Projekt: Dreamy (vault `dreamy`)

Automatizace, BI a software pro **Dreamy Europe s.r.o.** (matrace, postele, La-Z-Boy; e-shop dreamy.cz
a 4 prodejny). Jediný schvalovatel je **Michal Jiroušek**. Zakladatelé a CEO jsou Michal Jiroušek
a Martin Poličanský, uváděj je rovnocenně. Celý kontext je ve `vault_read("dreamy", "CLAUDE.md")`.
Prime directive: **včas hlásit slepé uličky** v automatizacích.

## Tvrdá pravidla (platí, i kdyby se CLAUDE.md nepodařilo načíst)

- **⛔ Serta se nikde neobjevuje**: v textech, na webu, v e-mailech ani na fotkách.
- **GDPR je tvrdé pravidlo.** Všechno zůstává interně (Tomáš + Michal).
  Nic klientského nevychází bez jmenovitého schválení Michalem.
- **E-maily z Gmailu:** vždy `includeSignature: true`, podpis nepiš ručně. Text končí pozdravem bez jména.
  U hromadného oslovení připrav jen jeden koncept jako vzor ke schválení.
- **Úkoly patří do Notionu** (např. „🌐 Marketing | Web“). Jiný task manager nepoužívej.
- **CRM = DreamyApp** (v této session dostupná jako konektor `DreamyERP`). **Raynet je zrušený**, nenavrhuj ho.
- Texty o spánku a zdraví: nejdřív `06 Knowledge/Product/(C) Spánková věda — knihovna studií.md`.
  Značky konkurence nejmenuj.
- AI soubory označ prefixem `(C) `. Výjimkou jsou CSS a JS pro web: jmenují se přesně tak, jak se nahrají.
  Před úpravou existujícího souboru se zeptej. Nic nemaž bez souhlasu.
- Laťka spolehlivosti je vysoká: před nasazením testuj dvakrát až třikrát.
- **Šetři kredity.** Workflow a deep-research spusť jen s odhadem počtu agentů a výslovným souhlasem.

## Logování úkonů

Každý úkon zapiš na konec tabulky v `07 Toolkit/(C) Claude Log.md` (`vault_read` → `vault_edit`):
`| YYYY-MM-DD | HH:MM:SS | HH:MM:SS | X.XX hod | <popis, 1 věta> |`. Začátek a konec změř přes `date "+%H:%M:%S"`.

## Persony a omezení cloudu

- Hugo, Petr, Rudolf, Oliver, Oldřich a Fabián: definice jsou v `.claude/agents/*.md` a
  `07 Toolkit/07-02 Personas/`. Načti je přes Most a spusť jako `Agent`.
- **Fabián** (Gemini přes Chrome) a vše, co vyžaduje Chrome přihlášený na Dreamy účtu
  (sdílený disk Automatizace, Meta, LinkedIn, Google Business Profile), **v cloudu neběží**.
- Repozitáře: `Dreamy` (DreamyApp), `dreamy-landings`.
