'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenBadge';

const SC: Record<string,string> = {
  scheduled:'bg-blue-100 text-blue-700', sent:'bg-violet-100 text-violet-700',
  completed:'bg-emerald-100 text-emerald-700', expired:'bg-slate-100 text-slate-400',
  skipped:'bg-slate-100 text-slate-400',
};

function npsColor(score: number|null) {
  if (score == null) return 'text-slate-300';
  if (score >= 9) return 'text-emerald-600 font-bold';
  if (score >= 7) return 'text-amber-600';
  return 'text-red-500 font-bold';
}

const PRESETS = [
  { label: 'All', params: {} },
  { label: 'Scheduled', params: { status: 'scheduled' } },
  { label: 'Completed', params: { status: 'completed' } },
] as const;

export default function SA023ListPage() {
  const router = useRouter();
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePreset, setActivePreset] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams(PRESETS[activePreset].params as Record<string,string>);
    const j = await fetch(`/api/bop/sal/surveys?${p}`).then(r => r.json());
    setSurveys(j.surveys ?? []);
    setLoading(false);
  }, [activePreset]);

  useEffect(() => { void load(); }, [load]);

  const completed = surveys.filter(s => s.status === 'completed');
  const avgNps = completed.length ? (completed.reduce((s, sv) => s + (sv.nps_score ?? 0), 0) / completed.length).toFixed(1) : '—';
  const promoters = completed.filter(s => s.nps_score >= 9).length;
  const detractors = completed.filter(s => s.nps_score <= 6).length;
  const escalated = surveys.filter(s => s.escalated).length;

  return (
    <div className="space-y-4 p-6">
      <ScreenHeader title="Customer Surveys" description="SA023 — NPS, satisfaction, and review routing" />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Avg NPS</p>
          <p className="text-2xl font-bold text-slate-800">{avgNps}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Promoters (9-10)</p>
          <p className="text-2xl font-bold text-emerald-600">{promoters}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Detractors (0-6)</p>
          <p className="text-2xl font-bold text-red-500">{detractors}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Escalated</p>
          <p className="text-2xl font-bold text-amber-600">{escalated}</p>
        </div>
      </div>

      <div className="flex gap-1">
        {PRESETS.map((p, i) => (
          <button key={p.label} onClick={() => setActivePreset(i)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activePreset === i ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}>{p.label}</button>
        ))}
        <span className="ml-auto text-xs text-slate-400">{surveys.length} surveys</span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">Loading...</div>
        ) : surveys.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">No surveys found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-left">
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Ref</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Customer</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">NPS</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Rating</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Routed</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Scheduled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {surveys.map(sv => (
                  <tr key={sv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{sv.survey_number ?? sv.id.slice(0,8)}</td>
                    <td className="px-4 py-2.5 text-slate-700">{sv.mdm_business_partners?.company_name ?? sv.mdm_business_partners?.name ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${SC[sv.status]??'bg-slate-100 text-slate-500'}`}>{sv.status}</span>
                      {sv.escalated && <span className="ml-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-500">escalated</span>}
                    </td>
                    <td className={`px-4 py-2.5 text-sm font-mono ${npsColor(sv.nps_score)}`}>{sv.nps_score ?? '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-500">{sv.rating ? '★'.repeat(sv.rating) + '☆'.repeat(5-sv.rating) : '—'}</td>
                    <td className="px-4 py-2.5 text-xs">
                      {sv.review_routed ? <span className="text-emerald-600 font-medium">{sv.review_platform}</span> : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">{sv.scheduled_at ? new Date(sv.scheduled_at).toLocaleDateString('nl-NL') : '—'}</td>
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
