#!/usr/bin/env bash
# bop-inspect gate — Phase 1 deterministic quality gates
# Exit non-zero if ANY ratchet is violated.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/../.." && pwd)"
BASELINES="$SCRIPT_DIR/baselines"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUT="$SCRIPT_DIR/out/$TIMESTAMP"
mkdir -p "$OUT"

PASS=0
FAIL=0
DETAILS=""

log_result() {
  local check="$1" status="$2" msg="$3"
  echo "[$status] $check: $msg"
  DETAILS="${DETAILS}
[$status] $check: $msg"
  if [ "$status" = "FAIL" ]; then FAIL=$((FAIL+1)); else PASS=$((PASS+1)); fi
}

ratchet_check() {
  # ratchet_check <name> <current> <baseline_file> <unit>
  local name="$1" current="$2" file="$3" unit="${4:-}"
  if [ ! -f "$file" ]; then
    echo "$current" > "$file"
    log_result "$name" "BASELINE" "set baseline: $current $unit"
  else
    local baseline
    baseline=$(cat "$file" | tr -d '[:space:]')
    local rose
    rose=$(node -e "console.log(parseFloat('$current') > parseFloat('$baseline') ? 1 : 0)")
    if [ "$rose" = "1" ]; then
      log_result "$name" "FAIL" "rose: $baseline → $current $unit (ratchet violated)"
    else
      log_result "$name" "PASS" "$current $unit (baseline: $baseline)"
      echo "$current" > "$file"
    fi
  fi
}

cd "$REPO"

# ── 1. TypeScript strict ──────────────────────────────────────────────────
echo "==> tsc strict check..."
TSC_ERRORS=0
npx tsc -p tsconfig.inspect.json --noEmit 2>&1 | grep "error TS" > "$OUT/tsc.txt" || true
TSC_ERRORS=$(wc -l < "$OUT/tsc.txt" | tr -d '[:space:]')
ratchet_check "tsc" "$TSC_ERRORS" "$BASELINES/tsc_errors.txt" "errors"

# ── 2. ESLint ─────────────────────────────────────────────────────────────
echo "==> eslint LLM anti-pattern check..."
npx eslint --config eslint.inspect.config.mjs \
  --cache --cache-location .eslintcache-inspect \
  app/ components/ lib/ > "$OUT/eslint.txt" 2>&1 || true
ESLINT_ERRORS=$(grep -E "[[:space:]]error[[:space:]]" "$OUT/eslint.txt" | wc -l | tr -d '[:space:]')
ratchet_check "eslint" "$ESLINT_ERRORS" "$BASELINES/eslint_errors.txt" "errors"

# ── 3. Knip (dead code) ───────────────────────────────────────────────────
echo "==> knip dead-code check..."
npx knip --reporter json > "$OUT/knip.json" 2>/dev/null || true
KNIP_COUNT=$(node -e "
try {
  const r = JSON.parse(require('fs').readFileSync('$OUT/knip.json','utf8'));
  const t = (r.files||[]).length + (r.issues ? Object.values(r.issues).reduce((a,v)=>a+(Array.isArray(v)?v.length:0),0) : 0);
  console.log(t);
} catch(e) { console.log(0); }
")
ratchet_check "knip" "$KNIP_COUNT" "$BASELINES/knip_findings.txt" "findings"

# ── 4. jscpd (duplication) ────────────────────────────────────────────────
echo "==> jscpd duplication check..."
npx jscpd --min-tokens 70 --threshold 3 --reporters json --output "$OUT" \
  app/ components/ lib/ > /dev/null 2>&1 || true
DUP_PCT=$(node -e "
try {
  const r = JSON.parse(require('fs').readFileSync('$OUT/jscpd-report.json','utf8'));
  const p = (r.statistics&&r.statistics.total&&r.statistics.total.percentage)||0;
  console.log(parseFloat(p).toFixed(2));
} catch(e) { console.log('0.00'); }
")
ratchet_check "jscpd" "$DUP_PCT" "$BASELINES/jscpd_pct.txt" "% duplication"

# ── 5. npm audit (ratchet) ────────────────────────────────────────────────
echo "==> npm audit (high+critical ratchet)..."
npm audit --json > "$OUT/audit.json" 2>&1 || true
AUDIT_HIGH=$(node -e "
try {
  const r = JSON.parse(require('fs').readFileSync('$OUT/audit.json','utf8'));
  const v = r.metadata&&r.metadata.vulnerabilities||{};
  console.log((v.high||0)+(v.critical||0));
} catch(e) { console.log(0); }
")
ratchet_check "audit" "$AUDIT_HIGH" "$BASELINES/audit_high.txt" "high/critical vulns"

# ── Summary ───────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════"
printf " bop-inspect gate — %s\n" "$TIMESTAMP"
printf " PASS: %d  FAIL: %d\n" "$PASS" "$FAIL"
echo "══════════════════════════════════════"
echo -e "$DETAILS"

node << JSEOF
const fs = require('fs');
fs.writeFileSync('$OUT/summary.json', JSON.stringify({
  timestamp: '$TIMESTAMP',
  pass: $PASS,
  fail: $FAIL,
  tsc_errors: $TSC_ERRORS,
  eslint_errors: $ESLINT_ERRORS,
  knip_findings: $KNIP_COUNT,
  dup_pct: parseFloat('$DUP_PCT'),
  audit_high: $AUDIT_HIGH
}, null, 2));
console.log('Summary: $OUT/summary.json');
JSEOF

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "GATE FAILED — promotion blocked."
  exit 1
fi
echo "GATE PASSED."
