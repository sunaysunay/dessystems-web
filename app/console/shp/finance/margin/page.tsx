'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

function StatTile({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4 min-w-[140px]">
      <div className="text-[11px] text-slate-500 font-semibold mb-1">{label}</div>
      <div className="text-2xl font-bold" style={{ color: color ?? 'var(--foreground)' }}>{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

function MarginRow({ label, revenue, cost, margin }: { label: string; revenue: number; cost: number; margin: number }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
      <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
      <div className="flex gap-4 font-mono text-xs">
        <span className="text-slate-400">€{revenue.toFixed(2)}</span>
        <span className="text-slate-400">€{cost.toFixed(2)}</span>
        <span className={margin >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>{margin.toFixed(1)}%</span>
      </div>
    </div>
  );
}

export default function SH035Page() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bop/shop/finance/margin').then(r => r.json()).then(d => {
      setReport(d);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6"><ScreenHeader /><p className="text-sm text-slate-400 mt-8 text-center">Loading…</p></div>;

  const m = report ?? {};
  const byCategory = m.by_category ?? m.categories ?? [];

  return (
    <div className="p-6 space-y-6">
      <ScreenHeader />

      <div className="flex flex-wrap gap-3">
        <StatTile label="REVENUE" value={`€${(m.total_revenue ?? 0).toFixed(2)}`} />
        <StatTile label="COGS" value={`€${(m.total_cost ?? 0).toFixed(2)}`} />
        <StatTile label="GROSS MARGIN" value={`€${(m.gross_margin ?? 0).toFixed(2)}`} color={(m.gross_margin ?? 0) >= 0 ? '#10b981' : '#ef4444'} />
        <StatTile label="MARGIN %" value={`${(m.margin_pct ?? 0).toFixed(1)}%`} color={(m.margin_pct ?? 0) >= 0 ? '#10b981' : '#ef4444'} />
        <StatTile label="ORDERS" value={m.order_count ?? 0} />
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-5">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">Margin by Category</h3>
        {byCategory.length === 0 && <p className="text-sm text-slate-400">No category breakdown available</p>}
        {byCategory.map((c: any, i: number) => (
          <MarginRow key={i} label={c.category ?? c.name ?? '—'} revenue={c.revenue ?? 0} cost={c.cost ?? 0} margin={c.margin_pct ?? 0} />
        ))}
      </div>

      <p className="text-[10px] text-slate-300 dark:text-slate-600 font-mono">Period: {m.period ?? '—'}</p>
    </div>
  );
}
