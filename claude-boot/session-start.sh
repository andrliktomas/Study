#!/bin/bash
# SessionStart hook: vloží do cloud session startovací prompt projektu (Obsidian vault přes Most).
#
# Projekt se určí takto (první shoda vyhrává):
#   1. proměnná prostředí MOST_VAULT (lumir | packlabs | ecoclaude | dreamy),
#      nastavená v cloud environmentu, např. environment „Dreamy“ s MOST_VAULT=dreamy
#   2. název git repozitáře (mapa níže)
# Bez shody vypíše jen krátkou nápovědu, jak projekt přepnout ručně.
set -euo pipefail

# Jen v cloudu; lokálně (Obsidian/Claudian) má vault vlastní CLAUDE.md.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

boot_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
prompts="$boot_dir/prompts"
rel_prompts="${prompts#"${CLAUDE_PROJECT_DIR:-$PWD}"/}"

vault="${MOST_VAULT:-}"

if [ -z "$vault" ]; then
  remote="$(git -C "${CLAUDE_PROJECT_DIR:-.}" remote get-url origin 2>/dev/null || true)"
  repo="$(basename "${remote%.git}" | tr '[:upper:]' '[:lower:]')"
  case "$repo" in
    dreamy|dreamy-landings)                 vault=dreamy ;;
    packlabs-web)                           vault=packlabs ;;
    lumirapp|lumir_tracker|lumir_network)   vault=lumir ;;
    *)                                      vault="" ;;
  esac
fi

vault="$(printf '%s' "$vault" | tr '[:upper:]' '[:lower:]')"

if [ -n "$vault" ] && [ -f "$prompts/$vault.md" ]; then
  echo "Tato session patří k projektu (vaultu) \`$vault\`. Následující instrukce platí po celou session."
  echo
  cat "$prompts/_spolecne.md"
  echo
  cat "$prompts/$vault.md"
else
  cat <<EOF
Projekt/vault pro tuto session není určen. Když uživatel řekne „projekt <název>“ nebo
z první zprávy jasně plyne jeden z vaultů lumir | packlabs | ecoclaude | dreamy, přečti
\`$rel_prompts/_spolecne.md\` a \`$rel_prompts/<vault>.md\` a řiď se jimi po zbytek session.
Jinak tohle ignoruj.
EOF
fi
