import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export async function GET() {
  const sb = getServerClient();

  const { data: listings, error } = await sb
    .from('bop_listings')
    .select('status, workflow_status, category, sale_method, year, des_score, created_at, tenant_id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = listings ?? [];

  // By status
  const byStatus: Record<string, number> = {};
  for (const r of rows) { const k = r.status ?? 'unknown'; byStatus[k] = (byStatus[k] ?? 0) + 1; }

  // By workflow_status
  const byWorkflow: Record<string, number> = {};
  for (const r of rows) { const k = r.workflow_status ?? 'unknown'; byWorkflow[k] = (byWorkflow[k] ?? 0) + 1; }

  // By category
  const byCategory: Record<string, number> = {};
  for (const r of rows) { const k = r.category ?? 'unknown'; byCategory[k] = (byCategory[k] ?? 0) + 1; }

  // By sale_method
  const bySaleMethod: Record<string, number> = {};
  for (const r of rows) { const k = r.sale_method ?? 'unknown'; bySaleMethod[k] = (bySaleMethod[k] ?? 0) + 1; }

  // Published = active + published
  const liveCount    = rows.filter(r => r.status === 'active' && r.workflow_status === 'published').length;
  const draftCount   = rows.filter(r => r.status === 'draft').length;
  const auctionCount = rows.filter(r => r.sale_method === 'auction').length;

  // Weekly new listings — last 12 weeks
  const weeks: Record<string, number> = {};
  const now = Date.now();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now - i * 7 * 86400000);
    const wk = `${d.getFullYear()}-W${String(getWeek(d)).padStart(2,'0')}`;
    weeks[wk] = 0;
  }
  for (const r of rows) {
    const d = new Date(r.created_at);
    const wk = `${d.getFullYear()}-W${String(getWeek(d)).padStart(2,'0')}`;
    if (wk in weeks) weeks[wk]++;
  }

  // Score distribution buckets
  const scored = rows.filter(r => r.des_score !== null);
  const scoreBuckets = { '0-25': 0, '26-50': 0, '51-75': 0, '76-100': 0 };
  for (const r of scored) {
    const s = r.des_score as number;
    if (s <= 25) scoreBuckets['0-25']++;
    else if (s <= 50) scoreBuckets['26-50']++;
    else if (s <= 75) scoreBuckets['51-75']++;
    else scoreBuckets['76-100']++;
  }
  const avgScore = scored.length ? Math.round(scored.reduce((s, r) => s + (r.des_score as number), 0) / scored.length) : null;

  return NextResponse.json({
    total: rows.length, liveCount, draftCount, auctionCount, avgScore,
    byStatus, byWorkflow, byCategory, bySaleMethod, scoreBuckets,
    weeklyTrend: Object.entries(weeks).map(([week, count]) => ({ week, count })),
  });
}

function getWeek(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
}
