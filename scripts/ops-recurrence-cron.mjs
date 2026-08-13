/**
 * ops-recurrence-cron.mjs
 * T5.2: RFC 5545 RRULE recurrence engine
 * Schedule: daily at 06:00 via PM2
 *
 * Finds recurring tasks (is_recurring=true, rrule IS NOT NULL, status != cancelled)
 * where the next occurrence is due. Creates a new task copy for each occurrence.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('/opt/dessystems-console-dev/.env.local', 'utf8')
    .split('\n').filter(l => l && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const BOT_TOKEN = env.BOP_TELEGRAM_BOT_TOKEN;
const CHAT_ID = env.BOP_TELEGRAM_CHAT_ID;

async function sendTelegram(text) {
  if (!BOT_TOKEN || !CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' }),
    });
  } catch { /* silent */ }
}

// Minimal RRULE parser — supports FREQ=DAILY/WEEKLY/MONTHLY, INTERVAL, BYDAY, COUNT, UNTIL
function parseRRule(rrule) {
  const parts = {};
  for (const seg of rrule.replace('RRULE:', '').split(';')) {
    const [k, v] = seg.split('=');
    parts[k] = v;
  }
  return parts;
}

function getNextOccurrence(rrule, lastDate) {
  const r = parseRRule(rrule);
  const freq = r.FREQ ?? 'DAILY';
  const interval = parseInt(r.INTERVAL ?? '1', 10);
  const base = lastDate ? new Date(lastDate) : new Date();
  const next = new Date(base);

  switch (freq) {
    case 'DAILY':
      next.setDate(next.getDate() + interval);
      break;
    case 'WEEKLY':
      next.setDate(next.getDate() + 7 * interval);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + interval);
      break;
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + interval);
      break;
  }

  if (r.UNTIL) {
    const until = new Date(r.UNTIL.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
    if (next > until) return null;
  }

  if (r.COUNT) {
    // COUNT tracking requires external state; skip for now — rely on UNTIL or manual cancellation
  }

  return next;
}

async function run() {
  console.log(`[recurrence] ${new Date().toISOString()} — checking recurring tasks`);

  const { data: tasks, error } = await supabase
    .from('op_tasks')
    .select('id, tenant_id, title, description, priority, assignee_id, department_id, sla_due_at, due_at, rrule, last_recurred_at, ref_object_type, ref_object_id, ref_object_label, checklist, goal_kr_id')
    .eq('is_recurring', true)
    .not('rrule', 'is', null)
    .is('deleted_at', null)
    .neq('status', 'cancelled');

  if (error) { console.error('[recurrence] query error:', error.message); return; }
  if (!tasks?.length) { console.log('[recurrence] no recurring tasks found'); return; }

  const now = new Date();
  let created = 0;

  for (const t of tasks) {
    const nextDate = getNextOccurrence(t.rrule, t.last_recurred_at);
    if (!nextDate || nextDate > now) continue;

    // Calculate new due_at offset
    let newDue = null;
    if (t.due_at && t.last_recurred_at) {
      const offset = new Date(t.due_at).getTime() - new Date(t.last_recurred_at).getTime();
      newDue = new Date(nextDate.getTime() + offset).toISOString();
    }

    let newSla = null;
    if (t.sla_due_at && t.last_recurred_at) {
      const offset = new Date(t.sla_due_at).getTime() - new Date(t.last_recurred_at).getTime();
      newSla = new Date(nextDate.getTime() + offset).toISOString();
    }

    // Reset checklist items to unchecked
    const freshChecklist = (t.checklist ?? []).map(item => ({ ...item, done: false }));

    const { data: result, error: createErr } = await supabase.rpc('op_task_create', {
      p_tenant_id: t.tenant_id,
      p_title: t.title,
      p_description: t.description,
      p_priority: t.priority,
      p_assignee_id: t.assignee_id,
      p_department_id: t.department_id,
      p_due_at: newDue,
      p_sla_due_at: newSla,
      p_ref_object_type: t.ref_object_type,
      p_ref_object_id: t.ref_object_id,
      p_ref_object_label: t.ref_object_label,
      p_checklist: freshChecklist,
      p_goal_kr_id: t.goal_kr_id,
    });

    if (createErr) {
      console.error(`[recurrence] failed to create from ${t.id}:`, createErr.message);
      continue;
    }

    // Update last_recurred_at on the template task
    await supabase
      .from('op_tasks')
      .update({ last_recurred_at: nextDate.toISOString(), updated_at: new Date().toISOString() })
      .eq('id', t.id);

    console.log(`[recurrence] created task from ${t.id}: ${result?.task_number ?? 'ok'}`);
    created++;
  }

  if (created > 0) {
    await sendTelegram(`🔁 <b>Recurrence Engine</b>\nCreated ${created} recurring task${created > 1 ? 's' : ''}.`);
  }

  console.log(`[recurrence] done — created ${created} task(s)`);
}

run().catch(console.error);
