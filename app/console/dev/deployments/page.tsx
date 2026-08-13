'use client';
import { useState, useEffect } from 'react';
import { BopSelect } from '@/components/BopSelect';
import { ScreenHeader } from '@/components/ScreenBadge';

const ENV_COLOR: Record<string, string> = {
  dev:  'bg-slate-100 text-slate-600',
  qa:   'bg-amber-100 text-amber-700',
  prod: 'bg-red-100 text-red-700',
};

const SUCCESS_COLOR = {
  true:  'bg-emerald-100 text-emerald-700',
  false: 'bg-red-100 text-red-600',
};

function fmt(ts: string) {
  return new Date(ts).toLocaleString('nl-NL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function duration(secs: number | null) {
  if (!secs) return '—';
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [filterEnv, setFilterEnv]     = useState('');

  function load(env: string) {
    setLoading(true);
    const params = new URLSearchParams();
    if (env) params.set('environment', env);
    fetch('/api/bop/dev/deployments?' + params.toString())
      .then(r => r.json())
      .then(d => { setDeployments(d.deployments ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(filterEnv); }, [filterEnv]);

  const total   = deployments.length;
  const success = deployments.filter(d => d.success).length;
  const failed  = deployments.filter(d => !d.success).length;
  const avgDur  = deployments.length
    ? Math.round(deployments.filter(d => d.duration_secs).reduce((a, d) => a + (d.duration_secs ?? 0), 0) / deployments.filter(d => d.duration_secs).length || 0)
    : 0;

  return (
    <div className="p-6">
      <ScreenHeader title="Deployments" description="DV006 — Deployment history and environment state tracking" />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Deploys',  value: total,                        color: 'text-slate-800' },
          { label: 'Successful',     value: success,                      color: 'text-emerald-700' },
          { label: 'Failed',         value: failed,                       color: 'text-red-600' },
          { label: 'Avg Duration',   value: avgDur ? `${avgDur}s` : '—', color: 'text-blue-700' },
        ].map(c => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{c.label}</p>
            <p className={`mt-1 text-2xl font-bold ${c.color}`}>{loading ? '—' : c.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <BopSelect value={filterEnv} onChange={v => setFilterEnv(v)} options={[{ value: String(''), label: `All environments` }, ...['dev','qa','prod'].map((e) => ({ value: String(e), label: `${e.toUpperCase()}` }))]} className="min-w-[130px]" />
        <button onClick={() => load(filterEnv)}
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200">
          Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading...</div>
        ) : deployments.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
            <p className="font-medium text-slate-500">No deployments recorded</p>
            <p className="text-sm text-slate-400">Deployments are logged automatically by promote.sh.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                {['Environment','Version','Result','Duration','Deployed By','Notes','Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deployments.map((d: any) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${ENV_COLOR[d.environment] ?? 'bg-slate-100 text-slate-500'}`}>
                      {d.environment}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {d.dev_releases?.version
                      ? <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700">{d.dev_releases.version}</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${d.success ? SUCCESS_COLOR.true : SUCCESS_COLOR.false}`}>
                      {d.success ? 'Success' : 'Failed'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{duration(d.duration_secs)}</td>
                  <td className="px-4 py-3 text-slate-600">{d.deployed_by ?? <span className="text-slate-300">—</span>}</td>
                  <td className="max-w-[200px] px-4 py-3 text-slate-500" title={d.notes}>
                    <span className="block truncate">{d.notes ?? <span className="text-slate-300">—</span>}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{d.deployed_at ? fmt(d.deployed_at) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
