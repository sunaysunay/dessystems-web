#!/usr/bin/env node
// OPS Goals Cron — nightly auto-compute KRs, snapshots, roll-up, health + Monday Telegram

import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('[goals-cron] Missing SUPABASE env vars'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { transport: WebSocket },
});

const TELEGRAM_TOKEN = process.env.BOP_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT  = process.env.BOP_TELEGRAM_CHAT_ID   || process.env.TELEGRAM_CHAT_ID;

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

// Metric query functions (mirrors compute-metric.ts for standalone execution)
const QUERIES = {
  async vans_sold(ps, pe, entity) {
    let q = supabase.from('ast_lifecycle_events').select('id', { count: 'exact' }).eq('event_type', 'sold').gte('event_date', ps).lte('event_date', pe);
    if (entity) q = q.eq('entity', entity);
    const { count } = await q;
    return count ?? 0;
  },
  async revenue_invoiced(ps, pe, entity) {
    let q = supabase.from('fin_invoices').select('gross').gte('invoice_date', ps).lte('invoice_date', pe).neq('status', 'cancelled');
    if (entity) q = q.eq('entity', entity);
    const { data } = await q;
    return (data ?? []).reduce((s, r) => s + Number(r.gross ?? 0), 0);
  },
  async gross_margin_sum(ps, pe, entity) {
    let q = supabase.from('ast_assets').select('selling_price, cost_price').eq('status', 'sold').gte('sold_at', ps).lte('sold_at', pe);
    if (entity) q = q.eq('entity', entity);
    const { data } = await q;
    return (data ?? []).reduce((s, r) => s + (Number(r.selling_price ?? 0) - Number(r.cost_price ?? 0)), 0);
  },
  async avg_days_to_sale(ps, pe, entity) {
    let q = supabase.from('ast_assets').select('created_at, sold_at').eq('status', 'sold').not('sold_at', 'is', null).gte('sold_at', ps).lte('sold_at', pe);
    if (entity) q = q.eq('entity', entity);
    const { data } = await q;
    if (!data?.length) return 0;
    const total = data.reduce((s, r) => s + Math.max(0, (new Date(r.sold_at) - new Date(r.created_at)) / 86400000), 0);
    return Math.round((total / data.length) * 10) / 10;
  },
  async inquiries_count(ps, pe, entity) {
    let q = supabase.from('crm_leads').select('id', { count: 'exact' }).gte('created_at', ps).lte('created_at', pe);
    if (entity) q = q.eq('entity', entity);
    const { count } = await q;
    return count ?? 0;
  },
  async inquiry_to_sale_conversion(ps, pe, entity) {
    let q = supabase.from('crm_leads').select('status').gte('created_at', ps).lte('created_at', pe);
    if (entity) q = q.eq('entity', entity);
    const { data } = await q;
    if (!data?.length) return 0;
    return Math.round((data.filter(r => r.status === 'won').length / data.length) * 10000) / 100;
  },
  async nps_avg(ps, pe) {
    const { data } = await supabase.from('sal_surveys').select('nps_score').not('nps_score', 'is', null).gte('created_at', ps).lte('created_at', pe);
    if (!data?.length) return 0;
    return Math.round((data.reduce((s, r) => s + Number(r.nps_score), 0) / data.length) * 10) / 10;
  },
  async review_score_avg(ps, pe) {
    const { data } = await supabase.from('sal_surveys').select('review_score').not('review_score', 'is', null).gte('created_at', ps).lte('created_at', pe);
    if (!data?.length) return 0;
    return Math.round((data.reduce((s, r) => s + Number(r.review_score), 0) / data.length) * 100) / 100;
  },
  async stock_count(_ps, _pe, entity) {
    let q = supabase.from('ast_assets').select('id', { count: 'exact' }).in('status', ['available', 'reserved']);
    if (entity) q = q.eq('entity', entity);
    const { count } = await q;
    return count ?? 0;
  },
};

function calcProgress(val, baseline, target, direction) {
  const range = target - baseline;
  let pct = range !== 0 ? ((val - baseline) / range) * 100 : 0;
  if (direction === 'decrease') pct = range !== 0 ? ((baseline - val) / (baseline - target)) * 100 : 0;
  return Math.max(0, Math.min(100, Math.round(pct * 100) / 100));
}

async function rollupGoal(goalId) {
  const { data: krs } = await supabase.from('op_goal_key_results').select('progress_pct, weight').eq('goal_id', goalId).is('deleted_at', null);
  if (!krs?.length) return;
  const totalW = krs.reduce((s, k) => s + Number(k.weight ?? 1), 0);
  const pct = totalW > 0 ? Math.round(krs.reduce((s, k) => s + Number(k.progress_pct ?? 0) * Number(k.weight ?? 1), 0) / totalW * 100) / 100 : 0;

  const { data: goal } = await supabase.from('op_goals').select('health, parent_goal_id, period_start, period_end').eq('id', goalId).single();
  const now = Date.now();
  const ps = goal?.period_start ? new Date(goal.period_start).getTime() : now;
  const pe = goal?.period_end ? new Date(goal.period_end).getTime() : now;
  const elapsed = pe > ps ? ((now - ps) / (pe - ps)) * 100 : 50;
  const paceDelta = pct - elapsed;
  const health = paceDelta >= -5 ? 'on_track' : paceDelta >= -20 ? 'at_risk' : 'off_track';
  const oldHealth = goal?.health;

  await supabase.from('op_goals').update({ progress_pct: Math.max(0, Math.min(100, pct)), health }).eq('id', goalId);

  if (oldHealth && oldHealth !== health) {
    const icons = { on_track: '✅', at_risk: '⚠️', off_track: '🔴', no_data: '❓' };
    await sendTelegram(`${icons[health] ?? '📊'} Goal health changed: ${oldHealth} → ${health}\n🔗 https://bop.dessystems.io/console/ops/goals/${goalId}`);
  }

  if (goal?.parent_goal_id) await rollupGoal(goal.parent_goal_id);
}

async function nightlyTick() {
  console.log('[goals-cron] Running nightly tick...');
  const today = new Date().toISOString().slice(0, 10);

  const { data: activeGoals } = await supabase.from('op_goals').select('id, entity, period_start, period_end, checkin_frequency').eq('status', 'active').is('deleted_at', null);
  if (!activeGoals?.length) { console.log('[goals-cron] No active goals'); return; }

  const goalIds = activeGoals.map(g => g.id);
  const { data: allKrs } = await supabase.from('op_goal_key_results').select('*').in('goal_id', goalIds).is('deleted_at', null);
  if (!allKrs?.length) { console.log('[goals-cron] No KRs found'); return; }

  const goalMap = Object.fromEntries(activeGoals.map(g => [g.id, g]));
  let computed = 0;

  // Check for KRs with stale data → no_data health
  const { data: latestSnaps } = await supabase
    .from('op_goal_kr_snapshots')
    .select('kr_id, snapshot_date')
    .in('kr_id', allKrs.map(k => k.id))
    .order('snapshot_date', { ascending: false });

  const latestSnapByKr = {};
  for (const s of (latestSnaps ?? [])) {
    if (!latestSnapByKr[s.kr_id]) latestSnapByKr[s.kr_id] = s.snapshot_date;
  }

  const CADENCE_DAYS = { daily: 2, weekly: 14, biweekly: 28, monthly: 60 };
  const noDataGoals = new Set();
  for (const kr of allKrs) {
    const goal = goalMap[kr.goal_id];
    const lastSnap = latestSnapByKr[kr.id];
    const cadence = CADENCE_DAYS[goal?.checkin_frequency] ?? 14;
    if (!lastSnap) {
      noDataGoals.add(kr.goal_id);
    } else {
      const daysSince = (Date.now() - new Date(lastSnap).getTime()) / 86400000;
      if (daysSince > cadence) noDataGoals.add(kr.goal_id);
    }
  }

  for (const kr of allKrs) {
    if (kr.metric_code) {
      const { data: cat } = await supabase.from('op_goal_metrics_catalog').select('query_key').eq('code', kr.metric_code).single();
      if (cat && QUERIES[cat.query_key]) {
        const goal = goalMap[kr.goal_id];
        const ps = goal?.period_start ?? new Date(new Date().getFullYear(), 0, 1).toISOString();
        const pe = goal?.period_end ?? new Date().toISOString();
        try {
          const val = await QUERIES[cat.query_key](ps, pe, goal?.entity);
          const pct = calcProgress(val, Number(kr.baseline), Number(kr.target), kr.direction);
          await supabase.from('op_goal_key_results').update({ current_value: val, progress_pct: pct }).eq('id', kr.id);
          computed++;
        } catch (e) { console.error(`[goals-cron] compute ${kr.kr_number}:`, e.message); }
      }
    }

    // Snapshot for ALL active KRs (auto + manual)
    await supabase.from('op_goal_kr_snapshots').upsert({
      kr_id: kr.id, snapshot_date: today,
      value: Number(kr.current_value), progress_pct: Number(kr.progress_pct),
    }, { onConflict: 'kr_id,snapshot_date' });
  }

  const rolledUp = new Set();
  for (const kr of allKrs) {
    if (!rolledUp.has(kr.goal_id)) {
      rolledUp.add(kr.goal_id);
      await rollupGoal(kr.goal_id);
    }
  }

  // Mark no_data goals (KRs with stale or missing snapshots)
  for (const goalId of noDataGoals) {
    const { data: g } = await supabase.from('op_goals').select('health').eq('id', goalId).single();
    if (g && g.health !== 'no_data' && g.health !== 'on_track') {
      await supabase.from('op_goals').update({ health: 'no_data' }).eq('id', goalId);
      console.log(`[goals-cron] ${goalId} → no_data (stale/missing snapshots)`);
    }
  }

  console.log(`[goals-cron] Nightly done: ${computed} auto-computed, ${allKrs.length} snapshots, ${rolledUp.size} goals rolled up`);
}

async function mondayCheckin() {
  console.log('[goals-cron] Monday check-in...');
  const { data: goals } = await supabase.from('op_goals').select('id, goal_number, title, progress_pct, health')
    .eq('status', 'active').eq('level', 0).is('deleted_at', null).order('created_at');

  if (!goals?.length) return;

  const healthIcon = { on_track: '✅', at_risk: '⚠️', off_track: '🔴', no_data: '❓' };
  const lines = goals.map(g =>
    `${healthIcon[g.health] ?? '📊'} <b>${g.goal_number}</b> ${g.title} — ${Math.round(Number(g.progress_pct))}%`
  );

  const msg = [
    `📅 <b>Monday Strategy Check-in</b>`,
    ``,
    ...lines,
    ``,
    `🔗 <a href="https://bop.dessystems.io/console/ops/goals/dashboard">Open Dashboard</a>`,
  ].join('\n');

  await sendTelegram(msg);
  console.log('[goals-cron] Monday check-in sent');
}

function msUntilNext(hour) {
  const now = new Date();
  const target = new Date(now);
  target.setHours(hour, 0, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target - now;
}

// Schedule nightly at 02:00
function scheduleNightly() {
  const ms = msUntilNext(2);
  console.log(`[goals-cron] Next nightly tick in ${Math.round(ms / 60000)} min`);
  setTimeout(async () => {
    await nightlyTick().catch(e => console.error('[goals-cron] nightly error:', e));
    scheduleNightly();
  }, ms);
}

// Schedule Monday check-in at 08:00
function scheduleMonday() {
  const now = new Date();
  const target = new Date(now);
  const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
  target.setDate(now.getDate() + daysUntilMonday);
  target.setHours(8, 0, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 7);
  const ms = target - now;
  console.log(`[goals-cron] Next Monday check-in in ${Math.round(ms / 3600000)} hours`);
  setTimeout(async () => {
    await mondayCheckin().catch(e => console.error('[goals-cron] monday error:', e));
    scheduleMonday();
  }, ms);
}

// ── Cycle Loop Driver ────────────────────────────────────────────────────────
// When next_review_at ≤ now → open a cycle row pre-filled with live data

const CADENCE_INTERVAL = { daily: 1, weekly: 7, biweekly: 14, monthly: 30 };

function detectBottleneck(krs, goalMap, goalId) {
  if (!krs?.length) return null;
  const goal = goalMap[goalId];
  const now = Date.now();
  const ps = goal?.period_start ? new Date(goal.period_start).getTime() : now;
  const pe = goal?.period_end ? new Date(goal.period_end).getTime() : now;
  const expectedPct = pe > ps ? Math.max(0, Math.min(100, ((now - ps) / (pe - ps)) * 100)) : 50;

  let worst = null;
  let worstGap = Infinity;
  for (const kr of krs) {
    const progress = Number(kr.progress_pct ?? 0);
    const weight = Number(kr.weight ?? 1);
    const weightedGap = (progress - expectedPct) * weight;
    if (weightedGap < worstGap) {
      worstGap = weightedGap;
      worst = kr;
    }
  }
  return worst;
}

async function cycleLoopTick() {
  console.log('[goals-cron] Running cycle loop tick...');
  const now = new Date();

  const { data: dueGoals } = await supabase
    .from('op_goals')
    .select('id, tenant_id, entity, period_start, period_end, progress_pct, health, checkin_frequency')
    .eq('status', 'active')
    .is('deleted_at', null)
    .lte('next_review_at', now.toISOString());

  if (!dueGoals?.length) {
    console.log('[goals-cron] No goals due for review');
    return;
  }

  const goalMap = Object.fromEntries(dueGoals.map(g => [g.id, g]));
  let opened = 0;

  for (const goal of dueGoals) {
    const { data: krs } = await supabase
      .from('op_goal_key_results')
      .select('id, progress_pct, weight, title, kr_number')
      .eq('goal_id', goal.id)
      .is('deleted_at', null);

    // Expected progress from period
    const ps = goal.period_start ? new Date(goal.period_start).getTime() : Date.now();
    const pe = goal.period_end ? new Date(goal.period_end).getTime() : Date.now();
    const expectedPct = pe > ps ? Math.max(0, Math.min(100, ((Date.now() - ps) / (pe - ps)) * 100)) : 50;
    const actualPct = Number(goal.progress_pct ?? 0);
    const gapPct = Math.round((actualPct - expectedPct) * 100) / 100;

    const bottleneck = detectBottleneck(krs, goalMap, goal.id);

    // Get next cycle number
    const { data: lastCycle } = await supabase
      .from('op_goal_cycles')
      .select('cycle_number')
      .eq('goal_id', goal.id)
      .order('cycle_number', { ascending: false })
      .limit(1)
      .single();

    const cycleNumber = (lastCycle?.cycle_number ?? 0) + 1;

    const { error: insertErr } = await supabase
      .from('op_goal_cycles')
      .insert({
        tenant_id: goal.tenant_id,
        goal_id: goal.id,
        cycle_number: cycleNumber,
        expected_progress: Math.round(expectedPct * 100) / 100,
        actual_progress: actualPct,
        gap_pct: gapPct,
        health_at_review: goal.health,
        bottleneck_kr_id: bottleneck?.id ?? null,
      });

    if (insertErr) {
      console.error(`[goals-cron] cycle insert error for ${goal.id}:`, insertErr.message);
      continue;
    }

    // Advance clock
    const days = CADENCE_INTERVAL[goal.checkin_frequency] ?? 7;
    const nextReview = new Date(Date.now() + days * 86400000).toISOString();
    await supabase.from('op_goals').update({
      next_review_at: nextReview,
      last_review_at: now.toISOString(),
    }).eq('id', goal.id);

    opened++;

    // Telegram alert if health is bad
    if (goal.health === 'off_track' || goal.health === 'at_risk') {
      const icon = goal.health === 'off_track' ? '🔴' : '⚠️';
      const bnLabel = bottleneck ? `\n📌 Bottleneck: ${bottleneck.kr_number} ${bottleneck.title}` : '';
      await sendTelegram(
        `${icon} <b>Cycle #${cycleNumber}</b> opened for review\n` +
        `Gap: ${gapPct > 0 ? '+' : ''}${gapPct.toFixed(1)}% | Progress: ${actualPct.toFixed(0)}% vs ${expectedPct.toFixed(0)}% expected${bnLabel}\n` +
        `🔗 <a href="https://bop.dessystems.io/console/ops/goals/${goal.id}">Open Goal</a>`
      );
    }
  }

  console.log(`[goals-cron] Cycle loop done: ${opened} cycles opened for ${dueGoals.length} due goals`);
}

console.log('[goals-cron] Starting ops-goals-cron');
nightlyTick().catch(e => console.error('[goals-cron] initial tick error:', e));
cycleLoopTick().catch(e => console.error('[goals-cron] initial cycle tick error:', e));
scheduleNightly();
scheduleMonday();

// Schedule cycle check every hour
setInterval(() => {
  cycleLoopTick().catch(e => console.error('[goals-cron] cycle tick error:', e));
}, 3600000);
