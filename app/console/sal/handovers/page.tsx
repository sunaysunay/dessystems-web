'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';

const SC: Record<string,string> = {
  scheduled:'bg-blue-100 text-blue-700', in_progress:'bg-amber-100 text-amber-700',
  executed:'bg-cyan-100 text-cyan-700', completed:'bg-emerald-100 text-emerald-700',
  cancelled:'bg-red-100 text-red-600',
};

const PRESETS = [
  { label: 'All', params: {} },
  { label: 'Scheduled', params: { status: 'scheduled' } },
  { label: 'In Progress', params: { status: 'in_progress' } },
  { label: 'Completed', params: { status: 'completed' } },
] as const;

export default function SA019ListPage() {
  const router = useRouter();
  const [handovers, setHandovers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePreset, setActivePreset] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams(PRESETS[activePreset].params as Record<string,string>);
    const j = await fetch(`/api/bop/sal/handovers?${p}`).then(r => r.json());
    setHandovers(j.handovers ?? []);
    setLoading(false);
  }, [activePreset]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <ScreenHeader title="Handovers" description="SA019 — Vehicle delivery checklist and signature" />
        <button onClick={() => router.back()} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>
      </div>

      <div className="flex gap-1">
        {PRESETS.map((p, i) => (
          <button key={p.label} onClick={() => setActivePreset(i)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activePreset === i ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}>{p.label}</button>
        ))}
        <span className="ml-auto text-xs text-slate-400">{handovers.length} handovers</span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading...</div>
        ) : handovers.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">No handovers found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-left">
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Ref</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Customer</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Order</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Scheduled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {handovers.map(h => (
                  <tr key={h.id} onClick={() => router.push(`/console/sal/handovers/${h.id}`)}
                    className="cursor-pointer hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{h.handover_number ?? h.id.slice(0,8)}</td>
                    <td className="px-4 py-2.5 text-slate-700">{h.mdm_business_partners?.company_name ?? h.mdm_business_partners?.name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{h.sal_orders?.order_number ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${SC[h.status]??'bg-slate-100 text-slate-500'}`}>{h.status?.replace(/_/g,' ')}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">{h.scheduled_at ? new Date(h.scheduled_at).toLocaleString() : '—'}</td>
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
