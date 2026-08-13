#!/usr/bin/env bash
# DESPANEL-V2 — health check for the console. Restarts pm2 if it stops answering.
# Install on the VPS as a cron (every 5 min):
#   */5 * * * * /opt/dessystems-console/healthcheck.sh >> /var/log/dessystems-health.log 2>&1
URL="http://127.0.0.1:4400/login"
PM2_NAME="dessystems-console"

code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$URL" || echo "000")
if [ "$code" = "200" ]; then
  echo "$(date '+%F %T') OK ($code)"
else
  echo "$(date '+%F %T') DOWN ($code) — restarting $PM2_NAME"
  pm2 restart "$PM2_NAME" --update-env
fi
