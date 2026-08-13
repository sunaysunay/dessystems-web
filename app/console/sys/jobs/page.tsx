'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return diff + 's ago';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400)return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

const KNOWN_JOBS = [
  { id: 'ROLE_CHANGED',          label: 'Role Assignment Sync',      schedule: 'on-demand', category: 'IAM'      },
  { id: 'ROLE_SCREEN_GRANTED',   label: 'Screen Permission Grant',   schedule: 'on-demand', category: 'IAM'      },
  { id: 'ROLE_SCREEN_REVOKED',   label: 'Screen Permission Revoke',  schedule: 'on-demand', category: 'IAM'      },
  { id: 'USER_LOCKED',           label: 'User Lock',                 schedule: 'on-demand', category: 'Security' },
  { id: 'USER_UNLOCKED',         label: 'User Unlock',               schedule: 'on-demand', category: 'Security' },
  { id: 'PW_RESET',              label: 'Password Reset',            schedule: 'on-demand', category: 'Security' },
  { id: 'USER_CREATED',          label: 'User Provisioning',         schedule: 'on-demand', category: 'IAM'      },
  { id: 'ACCESS_REQUEST',        label: 'Access Request Processing', schedule: 'on-demand', category: 'IAM'      },
  { id: 'SETTING_CHANGED',       label: 'Settings Sync',             schedule: 'on-demand', category: 'Config'   },
  { id: 'SCREEN_UPDATED',        label: 'Screen Registry Update',    schedule: 'on-demand', category: 'Config'   },
];

const CAT_COLOR: Record<string, string> = {
  IAM:      'bg-blue-100 text-blue-700',
  Security: 'bg-red-100 text-red-600',
  Config:   'bg-violet-100 text-violet-700',
};

export default function SY007Page() {
  const [rows, setRows]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState('');

  async function load() {
    setLoading(true);
    const d = await fetch('/api/bop/access-audit?view=iam&range=30').then(r => r.json());
    const changelog: any[] = d.rows ?? [];

    // Build latest-run map per action type
    const latestRun: Record<string, any> = {};
    const runCount: Record<string, number> = {};
    for (const e of changelog) {
      runCount[e.action] = (runCount[e.action] ?? 0) + 1;
      if (!latestRun[e.action] || e.created_at > latestRun[e.action].created_at) {
        latestRun[e.action] = e;
      }
    }

    const result = KNOWN_JOBS.map(j => ({
      ...j,
      last_run: latestRun[j.id]?.created_at ?? null,
      last_actor: latestRun[j.id]?.actor_email ?? null,
      run_count: runCount[j.id] ?? 0,
      status: latestRun[j.id] ? 'ok' : 'idle',
    }));
    setRows(result);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  const categories = [...new Set(KNOWN_JOBS.map(j => j.category))];
  const filtered = catFilter ? rows.filter(r => r.category === catFilter) : rows;
  const totalRuns = rows.reduce((a, r) => a + r.run_count, 0);
  const activeJobs = rows.filter(r => r.run_count > 0).length;

  return (
    <div>
      <ScreenHeader title="DB Jobs" description="SY007 — System event log: on-demand jobs tracked via bop_change_log (last 30 days)" />

      <div className="mb-5 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Job Types</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{KNOWN_JOBS.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Active (30d)</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{loading ? '—' : activeJobs}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Runs (30d)</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{loading ? '—' : totalRuns}</p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => setCatFilter('')}
          className={'rounded-lg px-3 py-1.5 text-xs font-medium ' + (!catFilter ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-500')}>
          All
        </button>
        {categories.map(c => (
          <button key={c} onClick={() => setCatFilter(c === catFilter ? '' : c)}
            className={'rounded-lg px-3 py-1.5 text-xs font-medium ' + (catFilter === c ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-500')}>
            {c}
          </button>
        ))}
        <button onClick={() => { void load(); }} className="ml-auto text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5">Refresh</button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3 text-left">Job</th>
              <th className="px-5 py-3 text-left">Category</th>
              <th className="px-5 py-3 text-left">Schedule</th>
              <th className="px-5 py-3 text-left">Last Run</th>
              <th className="px-5 py-3 text-left">Last Actor</th>
              <th className="px-5 py-3 text-right">Runs (30d)</th>
              <th className="px-5 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">Loading...</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-medium text-slate-800">{r.label}</td>
                <td className="px-5 py-3">
                  <span className={'rounded-full px-2 py-0.5 text-[10px] font-semibold ' + (CAT_COLOR[r.category] ?? 'bg-slate-100 text-slate-500')}>{r.category}</span>
                </td>
                <td className="px-5 py-3 text-xs text-slate-400">{r.schedule}</td>
                <td className="px-5 py-3 text-xs text-slate-400">{r.last_run ? timeAgo(r.last_run) : '—'}</td>
                <td className="px-5 py-3 text-xs text-slate-400">{r.last_actor ?? '—'}</td>
                <td className="px-5 py-3 text-right font-mono text-slate-700">{r.run_count}</td>
                <td className="px-5 py-3">
                  <span className={'rounded-full px-2 py-0.5 text-[10px] font-semibold ' + (r.status === 'ok' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400')}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
