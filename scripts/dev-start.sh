#!/bin/bash
# Starts the dev console and runs the audit after it's up.
cd /opt/dessystems-console-dev
pm2 start npm --name dessystems-console-dev -- run dev -- --port 4401 2>/dev/null || pm2 restart dessystems-console-dev
nohup /opt/dessystems-console-dev/scripts/post-restart-audit.sh &
echo 'Dev console starting. Audit will run in background.'
