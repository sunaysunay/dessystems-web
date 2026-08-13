'use client';
import { useState, useEffect , useCallback} from 'react';
import { useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';

const STATUS_COLOR: Record<string,string> = {
  draft:'bg-slate-100 text-slate-500', confirmed:'bg-blue-100 text-blue-700',
  in_progress:'bg-amber-100 text-amber-700', completed:'bg-emerald-100 text-emerald-700', cancelled:'bg-red-100 text-red-600',
};
const STATUSES = ['','draft','confirmed','in_progress','completed','cancelled'];

export default function SA009Page() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    const j = await fetch(`/api/bop/sal/orders?${params}`).then(r => r.json());
    setOrders(j.orders ?? []);
    setLoading(false);
  }, [status, search]);
  useEffect(() => { void load(); }, [load]);

  const totalRevenue = orders.filter(o => o.status === 'completed').reduce((s: number, o: any) => s + (o.sale_price ?? 0), 0);
  const openCount = orders.filter(o => ['draft','confirmed','in_progress'].includes(o.status)).length;

  return (
    <div>
      <ScreenHeader title="Orders" description="SA009 — BOP order list · sale, lease, rental, brokerage"/>

      <div className="mb-5 grid grid-cols-4 gap-3">
        {[
          {label:'Total orders', value: orders.length, cls:'text-slate-800'},
          {label:'Open', value: openCount, cls:'text-blue-600'},
          {label:'Completed revenue', value: `€${totalRevenue.toLocaleString()}`, cls:'text-emerald-600'},
          {label:'Cancelled', value: orders.filter(o=>o.status==='cancelled').length, cls:'text-slate-400'},
        ].map(k => (
          <div key={k.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="text-xs text-slate-400 mb-1">{k.label}</div>
            <div className={`text-xl font-bold ${k.cls}`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders..."
          className="w-56 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"/>
        <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none">
          {STATUSES.map(s => <option key={s} value={s}>{s ? s.replace('_',' ') : 'All status'}</option>)}
        </select>
        <span className="ml-auto text-xs text-slate-400">{orders.length} orders</span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
              <tr><th className="px-4 py-3 text-left">Order #</th><th className="px-4 py-3 text-left">Customer</th><th className="px-4 py-3 text-left">Vehicle</th><th className="px-4 py-3 text-right">Sale price</th><th className="px-4 py-3 text-left">Type</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Date</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orders.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No orders yet</td></tr>
              ) : orders.map((o: any) => (
                <tr key={o.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => router.push(`/console/sal/orders/${o.id}`)}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{o.order_number ?? o.id.slice(0,8)}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{o.mdm_business_partners?.company_name || o.mdm_business_partners?.name || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{o.ast_assets ? `${o.ast_assets.make} ${o.ast_assets.model} ${o.ast_assets.year}` : '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{o.sale_price ? `€${Number(o.sale_price).toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 capitalize">{o.type ?? '—'}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[o.status]??''}`}>{o.status}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-400">{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
