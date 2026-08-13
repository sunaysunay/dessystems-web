#!/usr/bin/env bash
# DESPANEL-V2 — verify the console is running on the VPS. Run on the VPS:
#   bash /opt/dessystems-console/check.sh
PORT="${PORT:-4400}"
BASE="http://127.0.0.1:${PORT}"
echo "== BOP v2 health =="
echo -n "pm2:        "; pm2 jlist 2>/dev/null | grep -q dessystems-console && echo "process present" || echo "NOT in pm2"
echo -n "listening:  "; ss -ltn 2>/dev/null | grep -q ":${PORT}" && echo "port ${PORT} up" || echo "port ${PORT} NOT listening"
for p in /login /console/dashboard /console/listings /console/systems; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${BASE}${p}")
  printf "  %-26s %s\n" "$p" "$code"
done
ip=$(hostname -I 2>/dev/null | awk '{print $1}')
echo "Public URL (if firewall allows): http://${ip}:${PORT}/login"
