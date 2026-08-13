'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

const STATUS_COLOR: Record<string, string> = {
  draft:    'bg-slate-100 text-slate-600',
  dev:      'bg-blue-100 text-blue-700',
  review:   'bg-amber-100 text-amber-700',
  qa:       'bg-violet-100 text-violet-700',
  approved: 'bg-emerald-100 text-emerald-700',
  queued:   'bg-orange-100 text-orange-700',
  deployed: 'bg-green-100 text-green-700',
  archived: 'bg-slate-100 text-slate-400',
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high:     'bg-orange-100 text-orange-700',
  medium:   'bg-amber-100 text-amber-700',
  low:      'bg-slate-100 text-slate-500',
};

const ENV_COLOR: Record<string, string> = {
  prod: 'bg-emerald-500',
  qa:   'bg-violet-500',
  dev:  'bg-blue-500',
};

export default function DevDashboardPage() {
  const [enhancements, setEnhancements] = useState<any[]>([]);
  const [commits, setCommits]           = useState<any[]>([]);
  const [envStates, setEnvStates]       = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    void Promise.all([
      fetch('/api/bop/dev/enhancements').then(r => r.json()),
      fetch('/api/bop/dev/commits?limit=20').then(r => r.json()),
      fetch('/api/bop/dev/environment-states').then(r => r.json()),
    ]).then(([e, c, env]) => {
      setEnhancements(e.enhancements ?? []);
      setCommits(c.commits ?? []);
      setEnvStates(env.states ?? []);
      setLoading(false);
    });
  }, []);

  const byStatus = (s: string) => enhancements.filter(e => e.status === s).length;
  const pendingCommits = commits.filter(c => c.status !== 'deployed' && c.status !== 'archived').length;

  const kpis = [
    { label: 'Active Dev',     value: byStatus('dev'),    color: 'text-blue-600' },
    { label: 'In Review',      value: byStatus('review'), color: 'text-amber-600' },
    { label: 'QA',             value: byStatus('qa'),     color: 'text-violet-600' },
    { label: 'Prod Queue',     value: pendingCommits,     color: 'text-orange-600' },
    { label: 'Recent Commits', value: commits.length,     color: 'text-slate-700' },
  ];

  return (
    <div className="p-6 space-y-6">
      <ScreenHeader title="Development Dashboard" description="DV001 — Development overview and pipeline status" />

      {loading ? (
        <div className="text-sm text-slate-400">Loading...</div>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {kpis.map(k => (
              <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500">{k.label}</p>
                <p className={`mt-1 text-3xl font-bold ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Environment states */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Environment Status</h2>
              <div className="space-y-3">
                {['prod','qa','dev'].map(env => {
                  const state = envStates.find((e: any) => e.environment === env);
                  return (
                    <div key={env} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${ENV_COLOR[env]}`} />
                        <span className="text-sm font-medium text-slate-700 uppercase">{env}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono text-slate-800">{state?.current_version ?? '—'}</p>
                        {state?.last_deployed_at && (
                          <p className="text-xs text-slate-400">{new Date(state.last_deployed_at).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Production queue — from dev_commits */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">
                Production Queue
                {commits.filter(c => c.status !== 'deployed' && c.status !== 'archived').length > 0 && (
                  <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
                    {commits.filter(c => c.status !== 'deployed' && c.status !== 'archived').length}
                  </span>
                )}
              </h2>
              {commits.filter(c => c.status !== 'deployed' && c.status !== 'archived').length === 0 ? (
                <p className="text-sm text-slate-400">No commits pending deployment</p>
              ) : (
                <div className="space-y-2">
                  {commits.filter(c => c.status !== 'deployed' && c.status !== 'archived').slice(0, 6).map((c: any) => (
                    <div key={c.id} className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2">
                      <code className="mt-0.5 shrink-0 rounded bg-slate-200 px-1 py-0.5 text-xs text-slate-600 font-mono">
                        {(c.hash ?? '').slice(0, 7)}
                      </code>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-slate-700">{c.message}</p>
                        <p className="text-xs text-slate-400">{c.author} · {c.branch}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[c.status] ?? 'bg-slate-100 text-slate-500'}`}>
                        {c.status ?? 'committed'}
                      </span>
                    </div>
                  ))}
                  {commits.filter(c => c.status !== 'deployed' && c.status !== 'archived').length > 6 && (
                    <p className="pt-1 text-center text-xs text-slate-400">
                      +{commits.filter(c => c.status !== 'deployed' && c.status !== 'archived').length - 6} more
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Recent commits */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Recent Commits</h2>
              {commits.length === 0 ? (
                <p className="text-sm text-slate-400">No commits recorded yet</p>
              ) : (
                <div className="space-y-2">
                  {commits.slice(0, 6).map((c: any) => (
                    <div key={c.id} className="flex items-start gap-2">
                      <code className="mt-0.5 shrink-0 rounded bg-slate-100 px-1 py-0.5 text-xs text-slate-600 font-mono">
                        {c.hash.slice(0,7)}
                      </code>
                      <div className="min-w-0">
                        <p className="truncate text-xs text-slate-700">{c.message}</p>
                        <p className="text-xs text-slate-400">{c.author} · {c.branch}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Enhancements table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-700">Active Enhancements</h2>
              <a href="/console/dev/enhancements" className="text-xs text-blue-600 hover:underline">View all</a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    {['Code','Title','Priority','Status','Business Owner','Release'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enhancements.filter(e => !['done','archived'].includes(e.status)).slice(0, 10).map((e: any) => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{e.code}</td>
                      <td className="px-4 py-3 font-medium text-slate-800 max-w-xs truncate">{e.title}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLOR[e.priority] ?? 'bg-slate-100 text-slate-500'}`}>
                          {e.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[e.status] ?? 'bg-slate-100 text-slate-500'}`}>
                          {e.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{e.business_owner ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{e.dev_releases?.version ?? '—'}</td>
                    </tr>
                  ))}
                  {enhancements.filter(e => !['done','archived'].includes(e.status)).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">
                        No active enhancements yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
