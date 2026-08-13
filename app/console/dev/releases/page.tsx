'use client';
import { useState, useEffect } from 'react';
import { BopSelect } from '@/components/BopSelect';
import { ScreenHeader } from '@/components/ScreenBadge';

const STATUS_COLOR: Record<string, string> = {
  draft:     'bg-slate-100 text-slate-600',
  planned:   'bg-blue-100 text-blue-700',
  staging:   'bg-amber-100 text-amber-700',
  released:  'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-500',
};

function fmt(ts: string) {
  return new Date(ts).toLocaleString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ReleasesPage() {
  const [releases, setReleases] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('');

  function load(status: string) {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    fetch('/api/bop/dev/releases?' + params.toString())
      .then(r => r.json())
      .then(d => { setReleases(d.releases ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(filter); }, [filter]);

  const total    = releases.length;
  const released = releases.filter(r => r.status === 'released').length;
  const planned  = releases.filter(r => r.status === 'planned').length;
  const draft    = releases.filter(r => r.status === 'draft').length;

  return (
    <div className="p-6">
      <ScreenHeader title="Releases" description="DV005 — Release management and version tracking" />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Releases', value: total,    color: 'text-slate-800' },
          { label: 'Released',       value: released, color: 'text-emerald-700' },
          { label: 'Planned',        value: planned,  color: 'text-blue-700' },
          { label: 'Draft',          value: draft,    color: 'text-slate-500' },
        ].map(c => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{c.label}</p>
            <p className={`mt-1 text-2xl font-bold ${c.color}`}>{loading ? '—' : c.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <BopSelect value={filter} onChange={v => setFilter(v)} options={[{ value: String(''), label: `All statuses` }, ...['draft','planned','staging','released','cancelled'].map((s) => ({ value: String(s), label: `${s[0].toUpperCase() + s.slice(1)}` }))]} className="min-w-[130px]" />
        <button onClick={() => load(filter)}
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200">
          Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading...</div>
        ) : releases.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
            <p className="font-medium text-slate-500">No releases yet</p>
            <p className="text-sm text-slate-400">Releases are created when enhancements are bundled for deployment.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                {['Version','Status','Planned Date','Notes','Created'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {releases.map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-sm font-semibold text-slate-800">
                      {r.version}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[r.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.planned_date ? fmt(r.planned_date) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="max-w-[280px] px-4 py-3 text-slate-500" title={r.notes}>
                    <span className="block truncate">{r.notes ?? <span className="text-slate-300">—</span>}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{r.created_at ? fmt(r.created_at) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
