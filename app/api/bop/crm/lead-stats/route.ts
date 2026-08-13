import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET() {
  const sb = getServerClient();

  const { data: leads, error } = await sb
    .from('crm_leads')
    .select('stage, source, expected_value, created_at, lost_reason')
    .is('deleted_at', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = leads ?? [];

  // Stage funnel
  const stages = ['new','contacted','qualified','won','lost'];
  const byStage = Object.fromEntries(stages.map(s => [s, { count: 0, value: 0 }]));
  for (const r of rows) {
    const s = r.stage ?? 'new';
    if (!byStage[s]) byStage[s] = { count: 0, value: 0 };
    byStage[s].count++;
    byStage[s].value += Number(r.expected_value ?? 0);
  }

  // Source breakdown
  const bySource: Record<string, number> = {};
  for (const r of rows) {
    const src = r.source ?? 'unknown';
    bySource[src] = (bySource[src] ?? 0) + 1;
  }

  // Lost reason breakdown
  const byLostReason: Record<string, number> = {};
  for (const r of rows.filter(r => r.stage === 'lost' && r.lost_reason)) {
    byLostReason[r.lost_reason!] = (byLostReason[r.lost_reason!] ?? 0) + 1;
  }

  // Weekly trend — last 12 weeks
  const weeks: Record<string, number> = {};
  const now = Date.now();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now - i * 7 * 86400000);
    const key = `${d.getFullYear()}-W${String(Math.ceil((d.getDate() - d.getDay() + 7) / 7)).padStart(2,'0')}`;
    weeks[key] = 0;
  }
  for (const r of rows) {
    const d = new Date(r.created_at);
    const key = `${d.getFullYear()}-W${String(Math.ceil((d.getDate() - d.getDay() + 7) / 7)).padStart(2,'0')}`;
    if (key in weeks) weeks[key]++;
  }

  const total       = rows.length;
  const won         = byStage['won']?.count ?? 0;
  const lost        = byStage['lost']?.count ?? 0;
  const winRate     = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : null;
  const pipelineVal = rows.filter(r => !['won','lost'].includes(r.stage ?? '')).reduce((s,r) => s + Number(r.expected_value ?? 0), 0);
  const avgDeal     = total > 0 ? Math.round(rows.reduce((s,r) => s + Number(r.expected_value ?? 0), 0) / total) : 0;

  return NextResponse.json({
    total, winRate, pipelineVal, avgDeal,
    byStage, bySource, byLostReason,
    weeklyTrend: Object.entries(weeks).map(([week, count]) => ({ week, count })),
  });
}
