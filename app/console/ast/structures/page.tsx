'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';

const STATUSES = ['purchased','inspection','preparation','published','reserved','sold','delivered'];
const STATUS_COLOR: Record<string,string> = {
  purchased:'bg-slate-100 text-slate-600', inspection:'bg-amber-100 text-amber-700',
  preparation:'bg-orange-100 text-orange-700', published:'bg-blue-100 text-blue-700',
  reserved:'bg-violet-100 text-violet-700', sold:'bg-emerald-100 text-emerald-700',
  delivered:'bg-green-100 text-green-700',
};

export default function AS003Page() {
  const router = useRouter();
  const [board, setBoard] = useState<Record<string,any[]>>({});
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'board'|'list'>('board');

  async function load() {
    setLoading(true);
    const j = await fetch('/api/bop/ast/lifecycle').then(r => r.json());
    setBoard(j.board ?? {});
    setAssets(j.assets ?? []);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  const total = assets.length;
  const forSale = (board['published']?.length??0) + (board['reserved']?.length??0);
  const avgDays = assets.length ? Math.round(
    assets.reduce((s: number, a: any) => s + Math.floor((Date.now() - new Date(a.created_at).getTime()) / 86400000), 0) / assets.length
  ) : 0;
  const soldCount = board['sold']?.length ?? 0;

  return (
    <div>
      <ScreenHeader title="Asset Lifecycle" description="AS003 — Vehicle pipeline by stage"/>

      <div className="mb-5 grid grid-cols-4 gap-4">
        {[['Total Assets', total, 'in inventory'],['For Sale', forSale, 'published + reserved'],['Sold', soldCount, 'completed'],['Avg Age', `${avgDays}d`, 'since intake']].map(([l,v,s]) => (
          <div key={String(l)} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{l}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{v}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-2">
        {['board','list'].map(v => (
          <button key={v} onClick={() => setView(v as any)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize ${view===v?'bg-slate-800 text-white':'border border-slate-200 text-slate-500'}`}>
            {v}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading...</div>
      ) : view === 'board' ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STATUSES.map(status => {
            const items = board[status] ?? [];
            return (
              <div key={status} className="flex-shrink-0 w-56">
                <div className="mb-2 flex items-center justify-between">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${STATUS_COLOR[status]}`}>{status}</span>
                  <span className="text-xs text-slate-400">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((a: any) => (
                    <div key={a.id} onClick={() => router.push(`/console/ast/inventory/${a.id}`)}
                      className="rounded-xl border border-slate-200 bg-white p-3 cursor-pointer hover:border-blue-300 transition-colors">
                      <div className="font-semibold text-sm text-slate-800">{a.make} {a.model}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{a.year} · {a.vehicle_type}</div>
                      {a.asking_price && <div className="mt-1.5 text-xs font-semibold text-blue-600">€{Number(a.asking_price).toLocaleString()}</div>}
                    </div>
                  ))}
                  {items.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-300">Empty</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">Vehicle</th>
                <th className="px-5 py-3 text-left">Year</th>
                <th className="px-5 py-3 text-left">Type</th>
                <th className="px-5 py-3 text-left">Stage</th>
                <th className="px-5 py-3 text-left">Price</th>
                <th className="px-5 py-3 text-left">Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assets.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">No assets</td></tr>
              ) : assets.map((a: any) => {
                const ageDays = Math.floor((Date.now() - new Date(a.created_at).getTime()) / 86400000);
                return (
                  <tr key={a.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => router.push(`/console/ast/inventory/${a.id}`)}>
                    <td className="px-5 py-3 font-medium text-slate-800">{a.make} {a.model}</td>
                    <td className="px-5 py-3 text-slate-500">{a.year}</td>
                    <td className="px-5 py-3 text-slate-500 capitalize">{a.vehicle_type}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_COLOR[a.status]??'bg-slate-100 text-slate-500'}`}>{a.status}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-700">{a.asking_price ? `€${Number(a.asking_price).toLocaleString()}` : '—'}</td>
                    <td className="px-5 py-3 text-xs text-slate-400">{ageDays}d</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
