'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';

const SC: Record<string,string> = {
  active:'bg-emerald-100 text-emerald-700', claimed:'bg-amber-100 text-amber-700',
  expired:'bg-slate-100 text-slate-400', voided:'bg-red-100 text-red-600',
};

const PRESETS = [
  { label: 'All', params: {} },
  { label: 'Active', params: { status: 'active' } },
  { label: 'Claimed', params: { status: 'claimed' } },
  { label: 'Expired', params: { status: 'expired' } },
] as const;

export default function SA021ListPage() {
  const router = useRouter();
  const [warranties, setWarranties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePreset, setActivePreset] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams(PRESETS[activePreset].params as Record<string,string>);
    const j = await fetch(`/api/bop/sal/warranties?${p}`).then(r => r.json());
    setWarranties(j.warranties ?? []);
    setLoading(false);
  }, [activePreset]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-4 p-6">
      <ScreenHeader title="Warranties" description="SA021 — Post-sale warranty tracking and claims" />

      <div className="flex gap-1">
        {PRESETS.map((p, i) => (
          <button key={p.label} onClick={() => setActivePreset(i)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activePreset === i ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}>{p.label}</button>
        ))}
        <span className="ml-auto text-xs text-slate-400">{warranties.length} warranties</span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading...</div>
        ) : warranties.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">No warranties found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-left">
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Ref</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Customer</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Type</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Starts</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Expires</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Claims</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {warranties.map(w => (
                  <tr key={w.id} onClick={() => router.push(`/console/sal/warranties/${w.id}`)}
                    className="cursor-pointer hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{w.warranty_number ?? w.id.slice(0,8)}</td>
                    <td className="px-4 py-2.5 text-slate-700">{w.mdm_business_partners?.company_name ?? w.mdm_business_partners?.name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 capitalize">{w.warranty_type ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${SC[w.status]??'bg-slate-100 text-slate-500'}`}>{w.status}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">{w.starts_at ? new Date(w.starts_at).toLocaleDateString('nl-NL') : '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">{w.expires_at ? new Date(w.expires_at).toLocaleDateString('nl-NL') : '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{w.claim_count ?? 0}</td>
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
