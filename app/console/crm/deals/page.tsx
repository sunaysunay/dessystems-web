'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';
import { Search, ChevronRight, Plus } from 'lucide-react';

const STAGES = [
  { key: '', label: 'All' },
  { key: 'discovery', label: 'Discovery' },
  { key: 'sourcing', label: 'Sourcing' },
  { key: 'vehicle_matched', label: 'Vehicle Matched' },
  { key: 'quoted', label: 'Quoted' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'reserved', label: 'Reserved' },
  { key: 'sold', label: 'Sold' },
  { key: 'closed_won', label: 'Won' },
  { key: 'closed_lost', label: 'Lost' },
];

const STAGE_COLOR: Record<string, string> = {
  discovery: 'bg-blue-100 text-blue-700',
  sourcing: 'bg-cyan-100 text-cyan-700',
  vehicle_matched: 'bg-indigo-100 text-indigo-700',
  quoted: 'bg-violet-100 text-violet-700',
  negotiation: 'bg-orange-100 text-orange-700',
  reserved: 'bg-amber-100 text-amber-700',
  sold: 'bg-emerald-100 text-emerald-700',
  closed_won: 'bg-green-100 text-green-700',
  closed_lost: 'bg-slate-100 text-slate-400',
};

export default function DealsListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { unit } = useScope();

  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ tenant_id: String(unit.id) });
    if (stageFilter) params.set('stage', stageFilter);
    if (search) params.set('q', search);
    const { deals: d } = await fetch(`/api/bop/crm/deals?${params}`).then(r => r.json());
    setDeals(d ?? []);
    setLoading(false);
  }, [unit.id, stageFilter, search]);

  useEffect(() => { void load(); }, [load]);

  const totalValue = deals.reduce((s, d) => s + (Number(d.expected_value) || 0), 0);
  const weightedValue = deals.reduce((s, d) => s + (Number(d.expected_value) || 0) * ((d.probability || 0) / 100), 0);

  return (
    <div>
      <ScreenHeader title="Deals" />

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Deals</div>
          <div className="text-lg font-bold text-slate-800 mt-1">{deals.length}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pipeline Value</div>
          <div className="text-lg font-bold text-slate-800 mt-1">€{totalValue.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Weighted Value</div>
          <div className="text-lg font-bold text-emerald-600 mt-1">€{Math.round(weightedValue).toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Avg Probability</div>
          <div className="text-lg font-bold text-slate-800 mt-1">
            {deals.length ? Math.round(deals.reduce((s, d) => s + (d.probability || 0), 0) / deals.length) : 0}%
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search deals..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {STAGES.map(s => (
            <button key={s.key} onClick={() => setStageFilter(s.key)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                stageFilter === s.key ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">Loading...</div>
        ) : deals.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">No deals found</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {deals.map(d => (
              <button key={d.id} onClick={() => router.push(`/console/crm/deals/${d.id}?tenant_id=${unit.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-400">{d.ref_code || d.id.slice(0, 8)}</span>
                    <span className="text-sm font-semibold text-slate-800 truncate">{d.title}</span>
                  </div>
                  {d.crm_leads && (
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      from lead {d.crm_leads.ref_code} · {d.crm_leads.title?.slice(0, 50)}
                    </div>
                  )}
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold ${STAGE_COLOR[d.stage] ?? 'bg-slate-100 text-slate-500'}`}>
                  {d.stage?.replace(/_/g, ' ')}
                </span>
                {d.expected_value && <span className="text-xs font-semibold text-slate-700">€{Number(d.expected_value).toLocaleString()}</span>}
                <span className="text-[10px] text-slate-400">{d.probability ?? 0}%</span>
                <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
