#!/bin/bash
# BOP prod deploy gate — wraps pm2 restart for dessystems-console (id 12).
# Blocks promotion to prod if any unregistered objects exist on dev.
# Usage: /opt/dessystems-console-dev/scripts/prod-deploy.sh

set -e

AUDIT_URL="http://localhost:4401/api/bop/sys/objects/audit"
PM2_PROD_NAME="dessystems-console"
LOG="/var/log/bop-audit.log"

echo ""
echo "=================================================="
echo "  BOP PROD DEPLOY GATE"
echo "=================================================="
echo "  Checking object registry before promoting to prod..."
echo ""

# ── Wait for dev server to be reachable ──────────────────────────────────────
for i in $(seq 1 6); do
  HTTP=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$AUDIT_URL" 2>/dev/null || echo "000")
  [ "$HTTP" = "200" ] && break
  if [ $i -eq 6 ]; then
    echo "  ERROR: Dev audit endpoint not reachable after 30s"
    echo "  Make sure dessystems-console-dev (pm2 id 13) is running."
    exit 1
  fi
  echo "  Waiting for dev server... ($i/6)"
  sleep 5
done

# ── Run audit ─────────────────────────────────────────────────────────────────
RESULT=$(curl -s --max-time 15 "$AUDIT_URL")
STATUS=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','error'))" 2>/dev/null)
GAP_COUNT=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('gap_count',0))" 2>/dev/null)
OBJECTS=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('registered',{}).get('objects',0))" 2>/dev/null)

echo "  Registry: $OBJECTS objects"
echo "  Status  : $STATUS"
echo "  Gaps    : $GAP_COUNT"
echo ""

if [ "$STATUS" = "gaps_found" ]; then
  echo "  ╔══════════════════════════════════════════════╗"
  echo "  ║  DEPLOY BLOCKED — $GAP_COUNT unregistered object(s)   ║"
  echo "  ╚══════════════════════════════════════════════╝"
  echo ""
  echo "  Unregistered objects:"
  echo "$RESULT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for g in d.get('gaps', []):
    print(f\"    [{g['type'].upper()}] {g['object_id']}  — {g['reason']}\")
" 2>/dev/null
  echo ""
  echo "  Fix: Add missing objects to /lib/bop/manifests/index.ts"
  echo "       then run: curl -X POST http://localhost:4401/api/bop/sys/objects/seed"
  echo "       then re-run this script."
  echo ""
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] DEPLOY BLOCKED: $GAP_COUNT gaps" >> "$LOG"
  exit 1
fi

if [ "$STATUS" != "clean" ]; then
  echo "  ERROR: Unexpected audit status: $STATUS"
  echo "  Check audit endpoint manually: curl $AUDIT_URL"
  exit 1
fi

# ── All clear — promote to prod ───────────────────────────────────────────────
echo "  ✓ Registry clean — promoting to prod"
echo ""
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] DEPLOY OK: $OBJECTS objects, promoting to prod" >> "$LOG"

pm2 restart "$PM2_PROD_NAME"

echo ""
echo "  ✓ $PM2_PROD_NAME restarted successfully"
echo "=================================================="
echo ""
