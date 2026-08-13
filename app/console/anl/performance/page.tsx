'use client';
import { useState, useEffect, useCallback } from 'react';
import { useScope } from '@/lib/scope-context';
import { ScreenHeader } from '@/components/ScreenBadge';
import { BopSelect } from '@/components/BopSelect';

type Range = '1d' | '3d' | '7d' | '30d' | '90d' | 'all';
interface Row { id: string; item_id: string; title: string; category: string; brand: string; status: string; is_featured: boolean; views: number; leads: number; conversion: number; no_leads: boolean }
interface Totals { total_views: number; total_leads: number; no_leads_count: number; overall_conversion: number }

const RANGES: { label: string; value: Range }[] = [
  { label: '24h', value: '1d' }, { label: '3 Days', value: '3d' }, { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' }, { label: '90 Days', value: '90d' }, { label: 'All Time', value: 'all' },
];

export default function PerformancePage() {
  const { unit } = useScope();
  const [range, setRange] = useState<Range>('3d');
  const [data, setData] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBrand, setFilterBrand] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/listings-perf?tenant_id=${unit.id}&range=${range}`);
      const json = await res.json();
      setData(json.data ?? []);
      setTotals(json.totals ?? null);
    } catch { setData([]); }
    setLoading(false);
  }, [unit.id, range]);

  useEffect(() => { void load(); }, [load]);

  const brands = [...new Set(data.map(r => r.brand).filter(Boolean))].sort();
  const filtered = data.filter(r =>
    (!search || r.title?.toLowerCase().includes(search.toLowerCase()) || r.item_id?.includes(search)) &&
    (!filterBrand || r.brand === filterBrand)
  );

  return (
    <div>
      <ScreenHeader title="Performance" description="Views, leads and conversion rate per listing" />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button key={r.value} onClick={() => setRange(r.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${range === r.value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {r.label}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by ID or title..."
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm w-48 focus:outline-none focus:border-blue-400" />
        <BopSelect value={filterBrand} onChange={setFilterBrand}
          options={[{value:'',label:'All brands'}, ...brands.map(b => ({value:b, label:b}))]}
          placeholder="All brands" className="w-40" />
      </div>

      {/* KPI row */}
      {totals && (
        <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total Views',       value: totals.total_views },
            { label: 'Total Leads',       value: totals.total_leads },
            { label: 'Overall Conv.',     value: `${totals.overall_conversion}%` },
            { label: 'No Leads (≥3 views)', value: totals.no_leads_count, highlight: true },
          ].map(k => (
            <div key={k.label} className="rounded-xl border border-slate-200 bg-white px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{k.label}</p>
              <p className={`mt-1 text-2xl font-bold ${k.highlight ? 'text-orange-500' : 'text-slate-900'}`}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-slate-400 text-sm">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left w-8">#</th>
                  <th className="px-4 py-3 text-left">Listing</th>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Brand</th>
                  <th className="px-4 py-3 text-right">Views</th>
                  <th className="px-4 py-3 text-right">Leads</th>
                  <th className="px-4 py-3 text-right">Conv.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No listings found</td></tr>
                ) : filtered.map((r, i) => (
                  <tr key={r.id} className={`hover:bg-slate-50 ${r.no_leads ? 'bg-orange-50/30' : ''}`}>
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-2.5 max-w-xs">
                      <div className="flex items-center gap-2">
                        {r.is_featured && <span className="text-orange-400 text-xs">★</span>}
                        <span className="truncate font-medium text-slate-800">{r.title || '—'}</span>
                        {r.no_leads && <span className="rounded bg-orange-100 px-1 py-0.5 text-[10px] text-orange-600">no leads</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{r.item_id}</td>
                    <td className="px-4 py-2.5 capitalize text-slate-500">{r.category}</td>
                    <td className="px-4 py-2.5 text-slate-500">{r.brand}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{r.views}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{r.leads}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`font-semibold ${r.conversion > 0 ? 'text-green-600' : 'text-slate-400'}`}>{r.conversion}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
