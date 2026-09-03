#!/usr/bin/env node
// DB Health Alert Cron — reads bop_db_health_log, creates notifications + Telegram for urgent findings
// Runs daily at 06:00 UTC via PM2, 1 hour after the pg_cron health snapshot at 05:00.

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

// Load .env.local
const __dir = dirname(fileURLToPath(import.meta.url));
try {
  const envFile = readFileSync(resolve(__dir, '..', '.env.local'), 'utf-8');
  for (const line of envFile.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=["']?(.+?)["']?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch { /* env already set */ }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('[db-health-cron] Missing SUPABASE env vars'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { transport: WebSocket },
  auth: { persistSession: false },
});

const TELEGRAM_TOKEN = process.env.BOP_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT  = process.env.BOP_TELEGRAM_CHAT_ID   || process.env.TELEGRAM_CHAT_ID;
const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const TENANT_ID = 300;

async function sendTelegram(text) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text, parse_mode: 'HTML' }),
    });
  } catch { /* non-blocking */ }
}

async function checkHealth() {
  const now = new Date().toISOString();
  console.log(`[db-health-cron] ${now} — checking latest health snapshot`);

  // Get the most recent snapshot
  const { data: logs, error } = await supabase
    .from('bop_db_health_log')
    .select('*')
    .order('captured_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('[db-health-cron] Query error:', JSON.stringify(error));
    return;
  }
  if (!logs?.length) {
    console.log('[db-health-cron] No health snapshots found — pg_cron may not have run yet');
    return;
  }

  const latest = logs[0];
  const snapshotAge = Date.now() - new Date(latest.captured_at).getTime();
  const snapshotAgeHours = Math.round(snapshotAge / 3600000);

  // Skip if snapshot is older than 48h (pg_cron might be down)
  if (snapshotAgeHours > 48) {
    console.log(`[db-health-cron] Latest snapshot is ${snapshotAgeHours}h old — pg_cron may need attention`);
    await createNotification(
      'warning',
      'DB Health: Snapshot Stale',
      `Last health snapshot is ${snapshotAgeHours} hours old. The daily pg_cron job may not be running.`,
      { snapshot_id: latest.id, age_hours: snapshotAgeHours }
    );
    return;
  }

  console.log(`[db-health-cron] Snapshot #${latest.id}: ${latest.summary} (${snapshotAgeHours}h ago)`);

  // Only alert if there are urgent findings
  if (latest.urgent_count === 0) {
    console.log('[db-health-cron] No urgent findings — all clear');
    return;
  }

  // Parse findings
  const findings = latest.findings || [];
  const urgentFindings = findings.filter(f => f.status === 'urgent');
  const topUrgent = urgentFindings.slice(0, 10);

  // Build notification
  const title = `DB Health: ${latest.urgent_count} Urgent Table${latest.urgent_count > 1 ? 's' : ''}`;
  const lines = topUrgent.map(f => {
    const issues = (f.issues || []).join(', ');
    return `• ${f.table_name}: ${f.dead_pct}% dead, XID ${Number(f.xid_age).toLocaleString()} — ${issues}`;
  });
  if (urgentFindings.length > 10) {
    lines.push(`... and ${urgentFindings.length - 10} more`);
  }
  const body = lines.join('\n');

  // Create sys_notification
  await createNotification('alert', title, body, {
    snapshot_id: latest.id,
    urgent_count: latest.urgent_count,
    monitor_count: latest.monitor_count,
    total_tables: latest.total_tables,
    top_tables: topUrgent.map(f => f.table_name),
  });

  // Send Telegram summary
  const tgLines = [
    `<b>🔴 DB Health Alert</b>`,
    `<code>${latest.summary}</code>`,
    '',
    ...topUrgent.slice(0, 5).map(f => `• <code>${f.table_name}</code>: ${f.dead_pct}% dead`),
  ];
  if (urgentFindings.length > 5) tgLines.push(`... +${urgentFindings.length - 5} more`);
  tgLines.push('', '<i>View: bop.dessystems.io/console/dba/health</i>');

  await sendTelegram(tgLines.join('\n'));
  console.log(`[db-health-cron] Alert sent: ${title}`);
}

async function createNotification(type, title, body, meta) {
  const { error } = await supabase.from('sys_notifications').insert({
    tenant_id: TENANT_ID,
    type,
    title,
    body,
    meta,
  });
  if (error) console.error('[db-health-cron] Failed to create notification:', error.message);
}

// Run immediately on start, then every 24h
checkHealth().catch(e => console.error('[db-health-cron] Error:', e));

setInterval(() => {
  checkHealth().catch(e => console.error('[db-health-cron] Error:', e));
}, INTERVAL_MS);

console.log('[db-health-cron] Started — will check every 24h');
