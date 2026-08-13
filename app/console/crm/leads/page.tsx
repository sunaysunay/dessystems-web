'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';

const STAGE_COLOR: Record<string,string> = {
  new:'bg-slate-100 text-slate-600', assigned:'bg-violet-100 text-violet-700',
  contacted:'bg-blue-100 text-blue-700', qualified:'bg-cyan-100 text-cyan-700',
  converted:'bg-emerald-100 text-emerald-700', lost:'bg-red-100 text-red-600',
  archived:'bg-slate-200 text-slate-500',
};

const PRESETS = [
  { label: 'All', params: {} },
  { label: 'Buy-side', params: { direction: 'buy_side' } },
  { label: 'Sell-side', params: { direction: 'sell_side' } },
  { label: 'Website', params: { channel: 'website' } },
  { label: 'Marketplace', params: { channel: 'marktplaats' } },
  { label: 'Qualified', params: { stage: 'qualified' } },
  { label: 'Lost', params: { stage: 'lost' } },
] as const;

export default function CR001Page() {
  const router = useRouter();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activePreset, setActivePreset] = useState(0);
  const [toast, setToast] = useState('');
  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 2500); }

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams(PRESETS[activePreset].params as Record<string,string>);
    if (search) p.set('search', search);
    const j = await fetch(`/api/bop/crm/leads?${p}`).then(r => r.json());
    setLeads(j.leads ?? []);
    setLoading(false);
  }, [activePreset, search]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-4 p-6">
      {toast && <div className="fixed top-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">{toast}</div>}

      <div className="flex items-center justify-between">
        <ScreenHeader title="Leads" description="CR001 — Unified lead overview" />
        <div className="flex items-center gap-2">
          <button onClick={() => { void load(); showToast('Refreshed'); }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Refresh
          </button>
          <button onClick={() => router.back()} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {PRESETS.map((p, i) => (
            <button key={p.label} onClick={() => setActivePreset(i)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activePreset === i ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
        <input type="text" placeholder="Search ref, name..." value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && void load()}
          className="ml-auto rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:outline-none w-56"
        />
        <span className="text-xs text-slate-400">{leads.length} leads</span>
      </div>

      {/* Data grid */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading...</div>
        ) : leads.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">No leads found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-left">
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Ref</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Name</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Direction</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Channel</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Stage</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Owner</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {leads.map(l => {
                  const partner = l.mdm_business_partners;
                  return (
                    <tr key={l.id} onClick={() => router.push(`/console/crm/leads/${l.id}`)}
                      className="cursor-pointer hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{l.ref_code ?? l.id.slice(0,8)}</td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-800">{l.title ?? partner?.company_name ?? partner?.name ?? '—'}</div>
                        {partner?.email && <div className="text-xs text-slate-400">{partner.email}</div>}
                      </td>
                      <td className="px-4 py-2.5">
                        {l.direction && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            l.direction === 'buy_side' ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'
                          }`}>{l.direction === 'buy_side' ? 'Buy' : 'Sell'}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{l.channel ?? l.source ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STAGE_COLOR[l.stage]??'bg-slate-100 text-slate-500'}`}>{l.stage}</span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{l.owner ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-400">{new Date(l.created_at).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
