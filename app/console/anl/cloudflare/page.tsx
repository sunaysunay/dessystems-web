'use client';
import { useState, useEffect, useCallback } from 'react';
import { useScope } from '@/lib/scope-context';
import { ScreenHeader } from '@/components/ScreenBadge';

type Range = '7d' | '30d' | '90d';
interface CFRow { date: string; requests: number; pageviews: number; unique_visitors: number; bandwidth_gb: number; cached_requests: number; threats: number }

export default function CloudflarePage() {
  const { unit } = useScope();
  const [range, setRange] = useState<Range>('30d');
  const [rows, setRows] = useState<CFRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/data?tenant_id=${unit.id}&range=${range}&view=cloudflare`);
      const json = await res.json();
      setRows(json.data ?? []);
    } catch { setRows([]); }
    setLoading(false);
  }, [unit.id, range]);

  useEffect(() => { void load(); }, [load]);

  const totals = rows.reduce((s, r) => ({ requests: s.requests + (r.requests||0), pageviews: s.pageviews + (r.pageviews||0), visitors: s.visitors + (r.unique_visitors||0), threats: s.threats + (r.threats||0) }), { requests: 0, pageviews: 0, visitors: 0, threats: 0 });
  const maxPV = Math.max(...rows.map(r => r.pageviews || 0), 1);

  return (
    <div>
      <ScreenHeader title="Cloudflare" description="Cloudflare edge traffic and performance metrics" />
      <div className="mb-5 flex gap-1">
        {(['7d','30d','90d'] as Range[]).map(r => (
          <button key={r} onClick={() => setRange(r)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${range === r ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{r}</button>
        ))}
      </div>
      {loading ? <div className="flex h-48 items-center justify-center text-slate-400 text-sm">Loading...</div>
       : rows.length === 0 ? <div className="flex h-48 items-center justify-center text-slate-400 text-sm">No Cloudflare data. Run sync from old admin.</div>
       : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[{ label:'Total Requests', value: totals.requests.toLocaleString() }, { label:'Page Views', value: totals.pageviews.toLocaleString() }, { label:'Unique Visitors', value: totals.visitors.toLocaleString() }, { label:'Threats', value: totals.threats, highlight: totals.threats > 0 }].map(k => (
              <div key={k.label} className="rounded-xl border border-slate-200 bg-white px-5 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{k.label}</p>
                <p className={`mt-1 text-2xl font-bold ${(k as any).highlight ? 'text-red-500' : 'text-slate-900'}`}>{k.value}</p>
              </div>
            ))}
          </div>
          <div className="mb-5 rounded-xl border border-slate-200 bg-white p-5">
            <p className="mb-3 text-sm font-semibold text-slate-700">Daily Page Views</p>
            <div className="flex h-32 items-end gap-px">
              {rows.map(r => (
                <div key={r.date} className="group flex-1" title={`${r.date}: ${r.pageviews}`}>
                  <div className="w-full rounded-t bg-sky-500 group-hover:bg-sky-400"
                    style={{ height: `${Math.round(((r.pageviews||0) / maxPV) * 100)}%`, minHeight: (r.pageviews||0) > 0 ? '2px' : '0' }} />
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-slate-400">
              <span>{rows[0]?.date}</span><span>{rows[rows.length-1]?.date}</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-right">Requests</th>
                  <th className="px-4 py-2 text-right">Page Views</th>
                  <th className="px-4 py-2 text-right">Visitors</th>
                  <th className="px-4 py-2 text-right">Bandwidth</th>
                  <th className="px-4 py-2 text-right">Threats</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[...rows].reverse().map(r => (
                  <tr key={r.date} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-600">{r.date}</td>
                    <td className="px-4 py-2 text-right">{(r.requests||0).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-semibold">{(r.pageviews||0).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{(r.unique_visitors||0).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-slate-400">{r.bandwidth_gb ? `${r.bandwidth_gb.toFixed(2)} GB` : '—'}</td>
                    <td className={`px-4 py-2 text-right ${(r.threats||0) > 0 ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>{r.threats || 0}</td>
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
