'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

export default function SA007Page() {
  const [orders, setOrders] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([
      fetch('/api/bop/sal/orders?limit=500').then(r => r.json()),
      fetch('/api/bop/sal/quotations?limit=500').then(r => r.json()),
    ]).then(([oj, qj]) => {
      setOrders(oj.orders ?? []);
      setQuotes(qj.quotations ?? []);
      setLoading(false);
    });
  }, []);

  const completed = orders.filter(o => o.status === 'completed');
  const revenue = completed.reduce((s: number, o: any) => s + (o.sale_price ?? 0), 0);
  const openOrders = orders.filter(o => ['draft','confirmed','in_progress'].includes(o.status));
  const openQuotes = quotes.filter(q => ['draft','sent'].includes(q.status));
  const avgSale = completed.length > 0 ? revenue / completed.length : 0;

  const byStatus = ['draft','confirmed','in_progress','completed','cancelled'].map(s => ({
    status: s, count: orders.filter(o => o.status === s).length,
    revenue: orders.filter(o => o.status === s).reduce((sum: number, o: any) => sum + (o.sale_price ?? 0), 0),
  }));

  const recentOrders = [...orders].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8);

  const STATUS_COLOR: Record<string,string> = {
    draft:'bg-slate-100 text-slate-500', confirmed:'bg-blue-100 text-blue-700',
    in_progress:'bg-amber-100 text-amber-700', completed:'bg-emerald-100 text-emerald-700', cancelled:'bg-red-100 text-red-600',
  };

  return (
    <div>
      <ScreenHeader title="Sales Dashboard" description="SA011 — Orders, revenue, and pipeline overview"/>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading...</div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-4 gap-3">
            {[
              {label:'Total revenue', value:`€${revenue.toLocaleString()}`, cls:'text-emerald-600'},
              {label:'Completed orders', value: completed.length, cls:'text-slate-800'},
              {label:'Avg sale price', value: avgSale > 0 ? `€${Math.round(avgSale).toLocaleString()}` : '—', cls:'text-slate-700'},
              {label:'Open quotations', value: openQuotes.length, cls:'text-blue-600'},
            ].map(k => (
              <div key={k.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs text-slate-400 mb-1">{k.label}</div>
                <div className={`text-2xl font-bold ${k.cls}`}>{k.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Orders by Status</p>
              <div className="space-y-2">
                {byStatus.map(s => {
                  const pct = orders.length > 0 ? (s.count / orders.length) * 100 : 0;
                  return (
                    <div key={s.status} className="flex items-center gap-3">
                      <span className={`w-20 rounded-full px-2 py-0.5 text-[10px] font-semibold text-center flex-shrink-0 ${STATUS_COLOR[s.status]}`}>{s.status}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{width:`${pct}%`}}/>
                      </div>
                      <span className="text-xs font-semibold text-slate-600 w-6 text-right">{s.count}</span>
                      {s.revenue > 0 && <span className="text-xs text-slate-400 w-24 text-right">€{s.revenue.toLocaleString()}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Pipeline</p>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-400">Open orders</span><span className="font-bold text-slate-800">{openOrders.length}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Open quotes</span><span className="font-bold text-slate-800">{openQuotes.length}</span></div>
                <div className="flex justify-between border-t border-slate-100 pt-3"><span className="text-slate-400">Total orders</span><span className="font-bold text-slate-800">{orders.length}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Conversion</span>
                  <span className="font-bold text-emerald-600">{orders.length > 0 ? Math.round((completed.length/orders.length)*100) : 0}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-400">Recent Orders</div>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 text-xs font-semibold uppercase text-slate-400">
                <tr><th className="px-4 py-2 text-left">Order #</th><th className="px-4 py-2 text-left">Customer</th><th className="px-4 py-2 text-right">Amount</th><th className="px-4 py-2 text-left">Status</th><th className="px-4 py-2 text-left">Date</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentOrders.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No orders yet</td></tr>
                ) : recentOrders.map((o:any) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{o.order_number ?? o.id.slice(0,8)}</td>
                    <td className="px-4 py-3 text-slate-700">{o.mdm_business_partners?.company_name || o.mdm_business_partners?.name || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{o.sale_price ? `€${Number(o.sale_price).toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[o.status]??''}`}>{o.status}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-400">{new Date(o.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
