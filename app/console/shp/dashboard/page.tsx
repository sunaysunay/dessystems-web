'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

function StatTile({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4 min-w-[120px]">
      <div className="text-[11px] text-slate-500 font-semibold mb-1">{label}</div>
      <div className="text-2xl font-bold" style={{ color: color ?? 'var(--foreground)' }}>{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

function AlertRow({ label, value, ok }: { label: string; value: number; ok: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
      <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
      <span className={`text-sm font-mono font-semibold ${ok ? 'text-emerald-600' : 'text-red-500'}`}>{value}</span>
    </div>
  );
}

export default function SH009Page() {
  const [monitor, setMonitor] = useState<any>(null);
  const [products, setProducts] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/bop/shop/monitoring').then(r => r.json()),
      fetch('/api/bop/shop/catalog/products?limit=0').then(r => r.json()),
    ]).then(([m, p]) => {
      setMonitor(m);
      setProducts(p);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6"><ScreenHeader /><p className="text-sm text-slate-400 mt-8 text-center">Loading…</p></div>;

  const m = monitor ?? {};

  return (
    <div className="p-6 space-y-6">
      <ScreenHeader />

      <div className="flex flex-wrap gap-3">
        <StatTile label="ORDERS TODAY" value={m.orders_today ?? 0} color={m.orders_today > 0 ? '#10b981' : undefined} />
        <StatTile label="FAILED PAYMENTS (24H)" value={m.failed_payments_24h ?? 0} color={m.failed_payments_24h > 0 ? '#ef4444' : '#10b981'} />
        <StatTile label="CRITICAL LOW STOCK" value={m.critical_low_stock?.length ?? 0} color={m.critical_low_stock?.length > 0 ? '#f59e0b' : '#10b981'} />
        <StatTile label="SLA BREACHED CLAIMS" value={m.sla_breached_claims ?? 0} color={m.sla_breached_claims > 0 ? '#ef4444' : '#10b981'} />
        <StatTile label="OVERDUE FULFILMENT" value={m.overdue_fulfilment ?? 0} color={m.overdue_fulfilment > 0 ? '#ef4444' : '#10b981'} />
        <StatTile label="CATALOG SIZE" value={products?.total ?? 0} sub="products" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-5">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">Operations Health</h3>
          <AlertRow label="Orders today" value={m.orders_today ?? 0} ok />
          <AlertRow label="Failed payments (24h)" value={m.failed_payments_24h ?? 0} ok={!m.failed_payments_24h} />
          <AlertRow label="SLA breached claims" value={m.sla_breached_claims ?? 0} ok={!m.sla_breached_claims} />
          <AlertRow label="Overdue fulfilment" value={m.overdue_fulfilment ?? 0} ok={!m.overdue_fulfilment} />
        </div>

        {m.critical_low_stock?.length > 0 && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-5">
            <h3 className="text-sm font-bold text-amber-700 dark:text-amber-300 mb-3">Critical Low Stock</h3>
            {m.critical_low_stock.map((item: any, i: number) => (
              <div key={i} className="text-sm text-amber-600 dark:text-amber-400 py-1">{item.sku ?? item.name ?? JSON.stringify(item)}</div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-300 dark:text-slate-600 font-mono">Last checked: {m.checked_at ?? '—'}</p>
    </div>
  );
}
