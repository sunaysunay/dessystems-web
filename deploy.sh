#!/usr/bin/env bash
# DESPANEL-V2 Phase 6 — deploy dessystems.io console to the VPS.
# ISOLATED: its own dir, own node_modules, own .next, own pm2 process.
# Does NOT touch the shared per-site repo or its .next. Run ONLY on explicit go-ahead.
set -euo pipefail

# ─── FILL THESE IN ───────────────────────────────────────────────
APP_DIR="/opt/dessystems-console"        # dedicated dir on the VPS (NOT the shared repo)
PM2_NAME="dessystems-console"
PORT=4400
# Supabase keys: put them in $APP_DIR/.env.local on the VPS (not committed).
# ─────────────────────────────────────────────────────────────────

echo "==> Building in $APP_DIR (isolated from shared .next)…"
cd "$APP_DIR"

# Capped heap to avoid the OOM pattern seen on this VPS.
export NODE_OPTIONS="--max-old-space-size=1024"

# Full install (build needs devDeps: tailwind/postcss/typescript). standalone output
# bundles only runtime deps, so this doesn't bloat the running server.
npm ci || npm install
rm -rf .next
npm run build

echo "==> Starting via standalone server (correct for output: 'standalone')…"
# next start does NOT work with standalone output — use the generated server.js.
# Copy static assets next to the standalone server (Next requirement).
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public 2>/dev/null || true

if [ -f ecosystem.config.js ]; then
  pm2 startOrReload ecosystem.config.js --only "$PM2_NAME" --update-env
elif pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_NAME" --update-env
else
  PORT=$PORT pm2 start ".next/standalone/server.js" --name "$PM2_NAME"
fi
pm2 save

echo ""
echo "DONE. Console running on 127.0.0.1:$PORT as pm2 '$PM2_NAME'."
echo "Point an Nginx/Cloudflare vhost for dessystems.io → 127.0.0.1:$PORT."
echo "The shared per-site apps and their .next were NOT touched."
