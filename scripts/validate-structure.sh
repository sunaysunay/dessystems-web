#!/usr/bin/env bash
# BOP Console — structural integrity check.
# Run before every build. Fails if any screen page is missing its registry entry.
set -euo pipefail

ERRORS=0
REGISTRY="lib/screen-registry.ts"
MESSAGES_DIR="messages"

echo "==> Validating BOP structure..."

# ── 1. Every page.tsx must have a screen-registry entry ──────────────────────
while IFS= read -r page; do
  # Convert file path to route:  app/console/dev/page.tsx → /console/dev
  route=$(echo "$page" | sed 's|^app||' | sed 's|/page\.tsx$||')
  # Skip dynamic segments like [id] — those are registered manually
  if echo "$route" | grep -q '\['; then
    continue
  fi
  # /console is the app root landing, not a TC screen
  if [ "$route" = "/console" ]; then
    continue
  fi
  if ! grep -qE "['\"](${route})['\"]" "$REGISTRY"; then
    echo "  [MISSING REGISTRY]  $route  (file: $page)"
    ERRORS=$((ERRORS + 1))
  fi
done < <(find app/console -name "page.tsx" | sort)

# ── 2. Every mod used in registry must have a MOD_COLORS entry ──────────────
while IFS= read -r mod; do
  if ! grep -q "${mod}:" "$REGISTRY"; then
    echo "  [MISSING MOD_COLOR] $mod"
    ERRORS=$((ERRORS + 1))
  fi
done < <(grep -oP "mod: '[A-Z]+'" "$REGISTRY" | grep -oP "'[A-Z]+'" | tr -d "'" | sort -u)

# ── 3. Every nav key used in Shell.tsx must exist in all message files ────────
while IFS= read -r key; do
  for lang in nl en de fr tr; do
    file="$MESSAGES_DIR/${lang}.json"
    if ! grep -q "\"${key}\"" "$file"; then
      echo "  [MISSING i18n NAV]  key='$key' in $file"
      ERRORS=$((ERRORS + 1))
    fi
  done
done < <(grep -oP "tn\(['\"]([a-zA-Z]+)['\"]\)" components/Shell.tsx | grep -oP "['\"][a-zA-Z]+['\"]" | tr -d "'\"" | sort -u)

# ── 4. Every group key used in Shell.tsx must exist in all message files ──────
while IFS= read -r key; do
  for lang in nl en de fr tr; do
    file="$MESSAGES_DIR/${lang}.json"
    # groups are nested under "groups" key
    if ! python3 -c "
import json, sys
with open('$file') as f: d = json.load(f)
sys.exit(0 if '$key' in d.get('groups', {}) else 1)
" 2>/dev/null; then
      echo "  [MISSING i18n GROUP] key='$key' in $file"
      ERRORS=$((ERRORS + 1))
    fi
  done
done < <(grep -oP "tg\(['\"]([a-zA-Z]+)['\"]\)" components/Shell.tsx | grep -oP "['\"][a-zA-Z]+['\"]" | tr -d "'\"" | sort -u)

# ── 5. Shell.tsx must not contain hardcoded label strings in nav ──────────────
if grep -nP '^\s+\{ label: "[A-Z]' components/Shell.tsx | grep -v '//'; then
  echo "  [HARDCODED NAV LABEL] Shell.tsx has hardcoded label strings — use tn() or tg()"
  ERRORS=$((ERRORS + 1))
fi

# ── Result ────────────────────────────────────────────────────────────────────
echo ""
if [ "$ERRORS" -gt 0 ]; then
  echo "  STRUCTURE CHECK FAILED — $ERRORS error(s). Fix before building."
  exit 1
else
  echo "  Structure OK — all checks passed."
fi
