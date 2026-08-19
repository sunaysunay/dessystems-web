'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

function Metric({ label, value, color, sub }: { label: string; value: string | number; color?: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4">
      <div className="text-[11px] text-slate-500 font-semibold mb-1">{label}</div>
      <div className="text-2xl font-bold" style={{ color: color ?? 'var(--foreground)' }}>{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

function Alert({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${ok ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'}`}>
      <span className="text-lg">{ok ? '✓' : '!'}</span>
      <span>{label}</span>
    </div>
  );
}

export default function SH070Page() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bop/shop/monitoring').then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6"><ScreenHeader /><p className="text-sm text-slate-400 mt-8 text-center">Loading…</p></div>;

  const m = data ?? {};

  return (
    <div className="p-6 space-y-6">
      <ScreenHeader />

      <div className="flex flex-wrap gap-3">
        <Metric label="ORDERS TODAY" value={m.orders_today ?? 0} color="#10b981" />
        <Metric label="FAILED PAYMENTS (24H)" value={m.failed_payments_24h ?? 0} color={m.failed_payments_24h > 0 ? '#ef4444' : '#10b981'} />
        <Metric label="LOW STOCK ITEMS" value={m.critical_low_stock?.length ?? 0} color={m.critical_low_stock?.length > 0 ? '#f59e0b' : '#10b981'} />
        <Metric label="SLA BREACHES" value={m.sla_breached_claims ?? 0} color={m.sla_breached_claims > 0 ? '#ef4444' : '#10b981'} />
        <Metric label="OVERDUE FULFILMENT" value={m.overdue_fulfilment ?? 0} color={m.overdue_fulfilment > 0 ? '#ef4444' : '#10b981'} />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Pipeline Health</h3>
        <Alert label="Payment processing" ok={!m.failed_payments_24h} />
        <Alert label="Fulfilment SLA" ok={!m.overdue_fulfilment} />
        <Alert label="Claims SLA" ok={!m.sla_breached_claims} />
        <Alert label="Stock levels" ok={!m.critical_low_stock?.length} />
      </div>

      {m.critical_low_stock?.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
          <h3 className="text-sm font-bold text-amber-700 dark:text-amber-300 mb-2">Critical Low Stock</h3>
          <div className="space-y-1">
            {m.critical_low_stock.map((item: any, i: number) => (
              <div key={i} className="flex justify-between text-sm text-amber-600 dark:text-amber-400">
                <span>{item.product_name ?? item.sku ?? '—'}</span>
                <span className="font-mono">{item.qty ?? 0} / {item.reorder_point ?? '?'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-slate-300 dark:text-slate-600 font-mono">Last checked: {m.checked_at ?? '—'}</p>
    </div>
  );
}
