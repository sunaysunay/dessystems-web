#!/bin/bash
# BOP post-restart audit hook — called after PM2 restarts app id 13 (dev :4401)
# Waits for server ready, then calls the audit API and logs gaps.

LOG=/var/log/bop-audit.log
API=http://localhost:4401/api/bop/sys/objects/audit

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Post-restart audit starting..." >> $LOG

# Wait up to 60s for server to respond
for i in $(seq 1 12); do
  sleep 5
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' $API)
  if [ "$STATUS" = "200" ]; then
    break
  fi
done

RESULT=$(curl -s $API)
STATUS=$(echo $RESULT | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','error'))" 2>/dev/null)
GAP_COUNT=$(echo $RESULT | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('gap_count',0))" 2>/dev/null)

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] status=$STATUS gap_count=$GAP_COUNT" >> $LOG

if [ "$STATUS" = "gaps_found" ]; then
  echo $RESULT | python3 -c "import sys,json; d=json.load(sys.stdin); [print('  GAP:', g['object_id'], '-', g['reason']) for g in d.get('gaps',[])]" >> $LOG 2>/dev/null
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] WARNING: $GAP_COUNT unregistered objects after restart" >> $LOG
else
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] CLEAN — all objects registered" >> $LOG
fi
