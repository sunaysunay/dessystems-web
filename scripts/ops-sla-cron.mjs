#!/usr/bin/env node
// OPS SLA & Escalation Cron — runs every 10 minutes via PM2
// Scans op_tasks for SLA breaches and escalates accordingly:
//   L0 → L1 at SLA - 2h  (warning)
//   L1 → L2 at SLA       (breach)
//   L2 → L3 at SLA + 4h  (critical)
// Each escalation writes an op_task_events row + sends Telegram.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[ops-sla] Missing SUPABASE env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TELEGRAM_TOKEN = process.env.BOP_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT  = process.env.BOP_TELEGRAM_CHAT_ID   || process.env.TELEGRAM_CHAT_ID;

async function sendTelegram(text, taskId) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT) return;
  const payload = { chat_id: TELEGRAM_CHAT, text, parse_mode: 'HTML' };
  if (taskId) {
    payload.reply_markup = JSON.stringify({
      inline_keyboard: [[
        { text: '▶ Start', callback_data: `start:${taskId}` },
        { text: '✅ Done', callback_data: `done:${taskId}` },
        { text: '😴 Snooze 4h', callback_data: `snooze:${taskId}` },
      ]],
    });
  }
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch { /* non-blocking */ }
}

async function tick() {
  const now = new Date();
  const sla2hAgo = new Date(now.getTime() + 2 * 3600_000).toISOString();

  // Fetch active tasks with SLA that haven't been fully escalated
  const { data: tasks, error } = await supabase
    .from('op_tasks')
    .select('id, task_number, title, assignee_id, sla_due_at, escalation_level, status')
    .not('sla_due_at', 'is', null)
    .in('status', ['open', 'in_progress', 'waiting_input', 'waiting_approval', 'blocked'])
    .is('deleted_at', null)
    .lt('escalation_level', 3)
    .order('sla_due_at');

  if (error) { console.error('[ops-sla] query error:', error.message); return; }
  if (!tasks?.length) return;

  const labels = ['Warning', 'Breach', 'Critical', 'Emergency'];
  const icons  = ['⚠️', '🚨', '🔴', '🆘'];
  const events = ['sla_warning', 'sla_breached', 'escalated', 'escalated'];
  let escalated = 0;

  for (const t of tasks) {
    const sla = new Date(t.sla_due_at);
    let newLevel = t.escalation_level;

    // Determine target level based on current time vs SLA
    if (now.getTime() >= sla.getTime() + 4 * 3600_000) {
      newLevel = 3;
    } else if (now.getTime() >= sla.getTime()) {
      newLevel = Math.max(newLevel, 2);
    } else if (now.getTime() >= sla.getTime() - 2 * 3600_000) {
      newLevel = Math.max(newLevel, 1);
    }

    if (newLevel <= t.escalation_level) continue;

    // Escalate
    const { error: upErr } = await supabase
      .from('op_tasks')
      .update({ escalation_level: newLevel, updated_at: now.toISOString() })
      .eq('id', t.id);

    if (upErr) { console.error(`[ops-sla] update ${t.task_number}:`, upErr.message); continue; }

    // Write event
    await supabase.from('op_task_events').insert({
      task_id: t.id,
      event_type: events[newLevel] ?? 'escalated',
      actor_id: null,
      payload: { from_level: t.escalation_level, to_level: newLevel, reason: 'SLA cron' },
    });

    // Telegram
    const tg = [
      `${icons[newLevel] ?? '🚨'} <b>${t.task_number}</b> — SLA ${labels[newLevel]}`,
      `📝 ${t.title}`,
      `📊 L${t.escalation_level} → L${newLevel}`,
      `📅 SLA: ${sla.toLocaleString()}`,
      t.assignee_id ? `👤 ${t.assignee_id.slice(0, 8)}` : '👤 Unassigned',
      `🔗 https://bop.dessystems.io/console/ops/tasks`,
    ].join('\n');
    await sendTelegram(tg, t.id);

    escalated++;
    console.log(`[ops-sla] ${t.task_number}: L${t.escalation_level} → L${newLevel}`);
  }

  if (escalated > 0) console.log(`[ops-sla] Escalated ${escalated} tasks`);
}

// Run every 10 minutes
const INTERVAL = 10 * 60_000;
console.log('[ops-sla] Starting SLA cron (10-min interval)');
tick().catch(e => console.error('[ops-sla] tick error:', e));
setInterval(() => tick().catch(e => console.error('[ops-sla] tick error:', e)), INTERVAL);
