#!/usr/bin/env bash
# DESPANEL-V2 — rebuild + restart on VPS. Run from /opt/dessystems-console.
# Usage:  bash rebuild.sh
set -euo pipefail
cd /opt/dessystems-console
export NODE_OPTIONS='--max-old-space-size=1024'
echo '==> Building...'
rm -rf .next
npm run build
echo '==> Copying static assets...'
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public 2>/dev/null || true
echo '==> Restarting pm2...'
pm2 startOrReload ecosystem.config.js --only dessystems-console --update-env
pm2 save
echo ''
echo 'DONE. Live at http://127.0.0.1:4400'
