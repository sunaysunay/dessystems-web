'use client';
import { useState, useEffect, Fragment } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return diff + 's ago';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400)return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function durationStr(start: string, end: string | null) {
  if (!end) return 'running...';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return ms + 'ms';
  if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
  return Math.floor(ms / 60000) + 'm ' + Math.round((ms % 60000) / 1000) + 's';
}

const IAM_JOBS = [
  { id: 'ROLE_CHANGED',          label: 'Role Assignment Sync',      schedule: 'on-demand', category: 'IAM',      description: 'Syncs role assignments when a role is assigned or removed from a user.' },
  { id: 'ROLE_SCREEN_GRANTED',   label: 'Screen Permission Grant',   schedule: 'on-demand', category: 'IAM',      description: 'Logs when screen-level permissions are granted to a role.' },
  { id: 'ROLE_SCREEN_REVOKED',   label: 'Screen Permission Revoke',  schedule: 'on-demand', category: 'IAM',      description: 'Logs when screen-level permissions are revoked from a role.' },
  { id: 'USER_LOCKED',           label: 'User Lock',                 schedule: 'on-demand', category: 'Security', description: 'Triggered when a user account is locked due to policy or admin action.' },
  { id: 'USER_UNLOCKED',         label: 'User Unlock',               schedule: 'on-demand', category: 'Security', description: 'Triggered when a locked user account is unlocked.' },
  { id: 'PW_RESET',              label: 'Password Reset',            schedule: 'on-demand', category: 'Security', description: 'Logs password reset events initiated by admin or self-service.' },
  { id: 'USER_CREATED',          label: 'User Provisioning',         schedule: 'on-demand', category: 'IAM',      description: 'Logs new user account creation and initial role assignment.' },
  { id: 'ACCESS_REQUEST',        label: 'Access Request Processing', schedule: 'on-demand', category: 'IAM',      description: 'Processes access requests submitted through the self-service portal.' },
  { id: 'SETTING_CHANGED',       label: 'Settings Sync',             schedule: 'on-demand', category: 'Config',   description: 'Logs changes to system configuration and tenant settings.' },
  { id: 'SCREEN_UPDATED',        label: 'Screen Registry Update',    schedule: 'on-demand', category: 'Config',   description: 'Tracks updates to the screen registry (new screens, permission changes).' },
];

const CI_JOBS = [
  { id: 'sessionise',       label: 'Sessionise Events',    schedule: 'every 5 min',   category: 'DESShop CI', triggerable: true, description: 'Groups raw page-view and event hits into user sessions using a 30-minute inactivity window.' },
  { id: 'aggregate_hourly', label: 'Hourly Aggregate',     schedule: 'hourly at :10', category: 'DESShop CI', triggerable: true, description: 'Rolls up sessionised events into hourly traffic, funnel, and revenue metrics.' },
  { id: 'aggregate_daily',  label: 'Daily Aggregate',      schedule: '02:15 AMS',     category: 'DESShop CI', triggerable: true, description: 'Builds daily aggregates for D-1 and D-2 (catches late-arriving events). Powers all dashboard KPIs.' },
  { id: 'settle_returns',   label: 'Settle Returns',       schedule: '02:45 AMS',     category: 'DESShop CI', triggerable: true, description: 'Reconciles returned/refunded orders against Mollie settlements. Restates revenue in ci_daily_sales.' },
  { id: 'data_health',      label: 'Data Health Checks',   schedule: '04:30 AMS',     category: 'DESShop CI', triggerable: true, description: 'Runs freshness, completeness, and anomaly checks across CI tables. Sends alerts on failures.' },
  { id: 'ad_spend',         label: 'Ad Spend Import',      schedule: '06:00 AMS',     category: 'DESShop CI', triggerable: true, description: 'Imports last 7 days of ad spend from Google Ads and Meta Ads into ci_ad_spend for ROAS calculations.' },
];

const CAT_COLOR: Record<string, string> = {
  IAM:            'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Security:       'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',
  Config:         'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'DESShop CI':   'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

const STATUS_STYLE: Record<string, string> = {
  ok:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  failed:  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  running: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  idle:    'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500',
};

type CiRun = {
  id: string; tenant_id: number; job_id: string; run_date: string;
  status: string; started_at: string; finished_at: string | null;
  rows_in: number | null; rows_out: number | null; error: string | null;
};

type JobRow = {
  id: string; label: string; schedule: string; category: string;
  description: string;
  last_run: string | null; last_actor: string | null; run_count: number;
  status: string; triggerable?: boolean; enabled: boolean;
  runs: CiRun[];
};

const DISABLED_KEY = 'sy007_disabled_jobs';

function loadDisabled(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(DISABLED_KEY) || '[]')); }
  catch { return new Set(); }
}

function saveDisabled(s: Set<string>) {
  localStorage.setItem(DISABLED_KEY, JSON.stringify([...s]));
}

export default function SY007Page() {
  const [rows, setRows]   = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState('');
  const [running, setRunning] = useState<Record<string, boolean>>({});
  const [runResult, setRunResult] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [disabled, setDisabled] = useState<Set<string>>(new Set());

  useEffect(() => { setDisabled(loadDisabled()); }, []);

  function toggleEnabled(jobId: string) {
    setDisabled(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId); else next.add(jobId);
      saveDisabled(next);
      return next;
    });
  }

  function toggleExpand(jobId: string) {
    setExpanded(prev => ({ ...prev, [jobId]: !prev[jobId] }));
  }

  async function load() {
    setLoading(true);
    const dis = loadDisabled();

    const d = await fetch('/api/bop/access-audit?view=iam&range=30').then(r => r.json());
    const changelog: any[] = d.rows ?? [];
    const latestRun: Record<string, any> = {};
    const runCount: Record<string, number> = {};
    for (const e of changelog) {
      runCount[e.action] = (runCount[e.action] ?? 0) + 1;
      if (!latestRun[e.action] || e.created_at > latestRun[e.action].created_at) {
        latestRun[e.action] = e;
      }
    }
    const iamRows: JobRow[] = IAM_JOBS.map(j => ({
      ...j,
      last_run: latestRun[j.id]?.created_at ?? null,
      last_actor: latestRun[j.id]?.actor_email ?? null,
      run_count: runCount[j.id] ?? 0,
      status: latestRun[j.id] ? 'ok' : 'idle',
      enabled: !dis.has(j.id),
      runs: [],
    }));

    const ciRes = await fetch('/api/bop/shop/analytics/jobs/history').then(r => r.ok ? r.json() : { runs: [] }).catch(() => ({ runs: [] }));
    const ciRuns: CiRun[] = ciRes.runs ?? [];
    const ciByJob: Record<string, CiRun[]> = {};
    const ciLatest: Record<string, CiRun> = {};
    const ciCount: Record<string, number> = {};
    for (const r of ciRuns) {
      if (!ciByJob[r.job_id]) ciByJob[r.job_id] = [];
      ciByJob[r.job_id].push(r);
      ciCount[r.job_id] = (ciCount[r.job_id] ?? 0) + 1;
      if (!ciLatest[r.job_id] || r.started_at > ciLatest[r.job_id].started_at) {
        ciLatest[r.job_id] = r;
      }
    }
    const ciRows: JobRow[] = CI_JOBS.map(j => ({
      ...j,
      last_run: ciLatest[j.id]?.started_at ?? null,
      last_actor: 'ci-jobs-cron',
      run_count: ciCount[j.id] ?? 0,
      status: ciLatest[j.id] ? (ciLatest[j.id].status === 'success' ? 'ok' : ciLatest[j.id].status) : 'idle',
      enabled: !dis.has(j.id),
      runs: (ciByJob[j.id] ?? []).slice(0, 20),
    }));

    setRows([...ciRows, ...iamRows]);
    setDisabled(dis);
    setLoading(false);
  }

  async function triggerJob(jobId: string) {
    setRunning(prev => ({ ...prev, [jobId]: true }));
    setRunResult(prev => { const n = { ...prev }; delete n[jobId]; return n; });
    try {
      const res = await fetch('/api/bop/shop/analytics/jobs/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: jobId, _trigger: 'manual' }),
      });
      const data = await res.json();
      if (res.ok) {
        setRunResult(prev => ({ ...prev, [jobId]: { ok: true, msg: `Done — ${JSON.stringify(data).slice(0, 120)}` } }));
      } else {
        setRunResult(prev => ({ ...prev, [jobId]: { ok: false, msg: data.error || `HTTP ${res.status}` } }));
      }
    } catch (err: any) {
      setRunResult(prev => ({ ...prev, [jobId]: { ok: false, msg: err.message } }));
    }
    setRunning(prev => ({ ...prev, [jobId]: false }));
    void load();
  }

  useEffect(() => { void load(); }, []);

  const categories = [...new Set([...CI_JOBS, ...IAM_JOBS].map(j => j.category))];
  const filtered = catFilter ? rows.filter(r => r.category === catFilter) : rows;
  const totalRuns = rows.reduce((a, r) => a + r.run_count, 0);
  const activeJobs = rows.filter(r => r.run_count > 0).length;
  const ciActive = rows.filter(r => r.category === 'DESShop CI' && r.run_count > 0).length;
  const enabledCount = rows.filter(r => r.enabled).length;

  return (
    <div>
      <ScreenHeader title="DB Jobs" description="SY007 — System jobs: DESShop CI pipeline + IAM events (last 30 days)" />

      <div className="mb-5 grid grid-cols-5 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Job Types</p>
          <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{CI_JOBS.length + IAM_JOBS.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Enabled</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{loading ? '—' : enabledCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">CI Jobs Active</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{loading ? '—' : `${ciActive}/${CI_JOBS.length}`}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">IAM Active (30d)</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{loading ? '—' : activeJobs - ciActive}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Runs (30d)</p>
          <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{loading ? '—' : totalRuns}</p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => setCatFilter('')}
          className={'rounded-lg px-3 py-1.5 text-xs font-medium ' + (!catFilter ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-800' : 'border border-slate-200 dark:border-slate-600 text-slate-500')}>
          All
        </button>
        {categories.map(c => (
          <button key={c} onClick={() => setCatFilter(c === catFilter ? '' : c)}
            className={'rounded-lg px-3 py-1.5 text-xs font-medium ' + (catFilter === c ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-800' : 'border border-slate-200 dark:border-slate-600 text-slate-500')}>
            {c}
          </button>
        ))}
        <button onClick={() => { void load(); }} className="ml-auto text-xs text-slate-400 hover:text-slate-600 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5">Refresh</button>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
            <tr>
              <th className="w-8 px-2 py-3"></th>
              <th className="px-4 py-3 text-left">Job</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Schedule</th>
              <th className="px-4 py-3 text-left">Last Run</th>
              <th className="px-4 py-3 text-right">Runs</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-center">Enabled</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {loading ? (
              <tr><td colSpan={9} className="px-5 py-10 text-center text-slate-400">Loading...</td></tr>
            ) : filtered.map(r => (
              <Fragment key={r.id}>
                <tr className={'hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer' + (!r.enabled ? ' opacity-50' : '')} onClick={() => toggleExpand(r.id)}>
                  <td className="px-2 py-3 text-center">
                    <span className={'inline-block transition-transform text-slate-400 text-xs select-none ' + (expanded[r.id] ? 'rotate-90' : '')}>
                      &#9654;
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{r.label}</td>
                  <td className="px-4 py-3">
                    <span className={'rounded-full px-2 py-0.5 text-[10px] font-semibold ' + (CAT_COLOR[r.category] ?? 'bg-slate-100 text-slate-500')}>{r.category}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 font-mono">{r.schedule}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{r.last_run ? timeAgo(r.last_run) : '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700 dark:text-slate-300">{r.run_count}</td>
                  <td className="px-4 py-3">
                    <span className={'rounded-full px-2 py-0.5 text-[10px] font-semibold ' + (STATUS_STYLE[r.status] ?? STATUS_STYLE.idle)}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => toggleEnabled(r.id)}
                      className={'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ' +
                        (r.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600')}
                      role="switch"
                      aria-checked={r.enabled}
                    >
                      <span className={'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ' +
                        (r.enabled ? 'translate-x-4' : 'translate-x-0')} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                    {r.triggerable && r.enabled ? (
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => triggerJob(r.id)}
                          disabled={running[r.id]}
                          className="rounded-md bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 px-3 py-1 text-[11px] font-semibold text-white transition-colors">
                          {running[r.id] ? 'Running...' : 'Run'}
                        </button>
                        {runResult[r.id] && (
                          <span className={'text-[10px] max-w-[180px] truncate ' + (runResult[r.id].ok ? 'text-emerald-600' : 'text-red-500')}>
                            {runResult[r.id].msg}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-300">—</span>
                    )}
                  </td>
                </tr>

                {expanded[r.id] && (
                  <tr className="bg-slate-50/60 dark:bg-slate-800/80">
                    <td colSpan={9} className="px-6 py-4">
                      <div className="space-y-4">
                        {/* Job details header */}
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Job Details</h4>
                            <div className="space-y-1.5 text-xs">
                              <div className="flex gap-2">
                                <span className="text-slate-400 w-20 shrink-0">Job ID</span>
                                <span className="font-mono text-slate-700 dark:text-slate-300">{r.id}</span>
                              </div>
                              <div className="flex gap-2">
                                <span className="text-slate-400 w-20 shrink-0">Category</span>
                                <span className="text-slate-700 dark:text-slate-300">{r.category}</span>
                              </div>
                              <div className="flex gap-2">
                                <span className="text-slate-400 w-20 shrink-0">Schedule</span>
                                <span className="font-mono text-slate-700 dark:text-slate-300">{r.schedule}</span>
                              </div>
                              <div className="flex gap-2">
                                <span className="text-slate-400 w-20 shrink-0">Status</span>
                                <span className={'rounded-full px-2 py-0.5 text-[10px] font-semibold ' + (STATUS_STYLE[r.status] ?? STATUS_STYLE.idle)}>{r.status}</span>
                              </div>
                              <div className="flex gap-2">
                                <span className="text-slate-400 w-20 shrink-0">Enabled</span>
                                <span className={'font-semibold ' + (r.enabled ? 'text-emerald-600' : 'text-red-500')}>{r.enabled ? 'Yes' : 'No'}</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Description</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{r.description}</p>
                            {r.last_run && (
                              <div className="mt-3 space-y-1.5 text-xs">
                                <div className="flex gap-2">
                                  <span className="text-slate-400 w-20 shrink-0">Last run</span>
                                  <span className="text-slate-700 dark:text-slate-300">{fmtDate(r.last_run)}</span>
                                </div>
                                {r.last_actor && (
                                  <div className="flex gap-2">
                                    <span className="text-slate-400 w-20 shrink-0">Actor</span>
                                    <span className="font-mono text-slate-700 dark:text-slate-300">{r.last_actor}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Run history for CI jobs */}
                        {r.runs.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Run History (last {r.runs.length})</h4>
                            <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead className="bg-slate-100 dark:bg-slate-700/60 text-[10px] font-semibold uppercase text-slate-400">
                                    <tr>
                                      <th className="px-3 py-2 text-left">Run Date</th>
                                      <th className="px-3 py-2 text-left">Started</th>
                                      <th className="px-3 py-2 text-left">Duration</th>
                                      <th className="px-3 py-2 text-right">Rows In</th>
                                      <th className="px-3 py-2 text-right">Rows Out</th>
                                      <th className="px-3 py-2 text-left">Status</th>
                                      <th className="px-3 py-2 text-left">Error</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {r.runs.map(run => (
                                      <tr key={run.id} className="hover:bg-white dark:hover:bg-slate-700/30">
                                        <td className="px-3 py-1.5 font-mono text-slate-600 dark:text-slate-400">{run.run_date}</td>
                                        <td className="px-3 py-1.5 text-slate-500">{fmtDate(run.started_at)}</td>
                                        <td className="px-3 py-1.5 font-mono text-slate-500">{durationStr(run.started_at, run.finished_at)}</td>
                                        <td className="px-3 py-1.5 text-right font-mono text-slate-600 dark:text-slate-400 tabular-nums">{run.rows_in ?? '—'}</td>
                                        <td className="px-3 py-1.5 text-right font-mono text-slate-600 dark:text-slate-400 tabular-nums">{run.rows_out ?? '—'}</td>
                                        <td className="px-3 py-1.5">
                                          <span className={'rounded-full px-2 py-0.5 text-[10px] font-semibold ' + (
                                            run.status === 'success' ? STATUS_STYLE.ok :
                                            run.status === 'failed' ? STATUS_STYLE.failed :
                                            run.status === 'running' ? STATUS_STYLE.running :
                                            STATUS_STYLE.idle
                                          )}>{run.status}</span>
                                        </td>
                                        <td className="px-3 py-1.5 text-red-500 max-w-[200px] truncate">{run.error || '—'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )}

                        {r.runs.length === 0 && r.category !== 'DESShop CI' && (
                          <p className="text-xs text-slate-400 italic">IAM/Config events are logged in the change log. Expand for metadata only.</p>
                        )}
                        {r.runs.length === 0 && r.category === 'DESShop CI' && (
                          <p className="text-xs text-slate-400 italic">No runs recorded in the last 30 days.</p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
