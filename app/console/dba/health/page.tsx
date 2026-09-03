'use client';
import React, { useEffect, useState } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

const SEV_COLORS: Record<string, string> = {
  critical: 'bg-red-50 text-red-700 border-red-200',
  high:     'bg-orange-50 text-orange-700 border-orange-200',
  medium:   'bg-amber-50 text-amber-700 border-amber-200',
  low:      'bg-green-50 text-green-700 border-green-200',
  info:     'bg-blue-50 text-blue-700 border-blue-200',
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  in_range: { label: 'In Range',         bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
  monitor:  { label: 'Needs Attention',  bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  urgent:   { label: 'Urgent',           bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500' },
};

const TABS = [
  { key: 'tables',      label: 'Tables' },
  { key: 'connections', label: 'Connections' },
  { key: 'extensions',  label: 'Extensions' },
  { key: 'trend',       label: 'Audit History' },
  { key: 'jobs',        label: 'Background Jobs' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function deadColor(pct: number): string {
  if (pct < 5) return 'text-green-600';
  if (pct <= 20) return 'text-amber-600';
  return 'text-red-600';
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function DB009Page() {
  const [overview, setOverview]       = useState<any>(null);
  const [findings, setFindings]       = useState<any[]>([]);
  const [tables, setTables]           = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [extensions, setExtensions]   = useState<any[]>([]);
  const [activeTab, setActiveTab]     = useState<TabKey>('tables');
  const [snapshots, setSnapshots]     = useState<any[]>([]);
  const [cronJobs, setCronJobs]       = useState<any[]>([]);
  const [auditing, setAuditing]       = useState(false);
  const [vacuuming, setVacuuming]     = useState(false);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [fetched, setFetched] = useState<Record<string, boolean>>({ tables: false, connections: false, extensions: false, trend: false });
  const [sevFilter, setSevFilter]     = useState<string | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [toast, setToast]             = useState<string | null>(null);

  function fetchAction(action: string) {
    return fetch(`/api/bop/dba/health?action=${action}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        return d;
      });
  }

  function loadInitial() {
    setLoading(true);
    setError(null);
    Promise.all([
      fetchAction('overview'),
      fetchAction('findings'),
      fetchAction('tables'),
    ])
      .then(([ov, fi, tb]) => {
        setOverview(ov.overview ?? ov);
        setFindings(fi.findings ?? []);
        setTables(tb.tables ?? []);
        setFetched({ tables: true, connections: false, extensions: false, trend: false, jobs: false });
        setLastRefresh(new Date());
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  function loadTab(tab: TabKey) {
    if (fetched[tab]) return;
    setLoading(true);
    const action = tab === 'jobs' ? 'cron_history' : tab;
    fetchAction(action)
      .then(d => {
        if (tab === 'tables')      setTables(d.tables ?? []);
        if (tab === 'connections') setConnections(d.connections ?? []);
        if (tab === 'extensions')  setExtensions(d.extensions ?? []);
        if (tab === 'trend')       setSnapshots(d.snapshots ?? []);
        if (tab === 'jobs')        setCronJobs(d.jobs ?? []);
        setFetched(prev => ({ ...prev, [tab]: true }));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  function refreshAll() {
    setFetched({ tables: false, connections: false, extensions: false, trend: false, jobs: false });
    loadInitial();
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  function runAudit() {
    setAuditing(true);
    setError(null);
    fetchAction('run_audit')
      .then(d => {
        if (d.snapshot) {
          setSnapshots(prev => [d.snapshot, ...prev]);
          setFetched(prev => ({ ...prev, trend: false }));
          const s = d.snapshot;
          showToast(`Audit complete — ${s.urgent_count ?? 0} urgent, ${s.monitor_count ?? 0} monitor, ${s.in_range_count ?? 0} healthy`);
        } else {
          showToast('Audit completed');
        }
        refreshAll();
      })
      .catch(e => setError(e.message))
      .finally(() => setAuditing(false));
  }

  function runVacuum() {
    setVacuuming(true);
    setError(null);
    fetchAction('run_vacuum')
      .then(d => {
        showToast(d.result ?? 'Vacuum scheduled — runs within 1 minute');
      })
      .catch(e => setError(e.message))
      .finally(() => setVacuuming(false));
  }

  useEffect(() => { loadInitial(); }, []);

  function switchTab(tab: TabKey) {
    setActiveTab(tab);
    loadTab(tab);
  }

  const sevCounts: Record<string, number> = {};
  for (const f of findings) {
    const s = f.severity ?? 'info';
    sevCounts[s] = (sevCounts[s] || 0) + 1;
  }

  const metrics: any[] = overview?.metrics ?? [];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <ScreenHeader />

      {/* Refresh bar */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400">
          {lastRefresh ? `Last refresh: ${formatTime(lastRefresh)}` : ''}
        </div>
        <div className="flex gap-2">
          <button
            onClick={runVacuum}
            disabled={vacuuming || loading}
            className="px-3 py-1.5 text-sm rounded border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-50 font-medium"
          >
            {vacuuming ? 'Scheduling...' : 'Run Vacuum'}
          </button>
          <button
            onClick={runAudit}
            disabled={auditing || loading}
            className="px-3 py-1.5 text-sm rounded border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 font-medium"
          >
            {auditing ? 'Running Audit...' : 'Run Audit Now'}
          </button>
          <button
            onClick={refreshAll}
            disabled={loading}
            className="px-3 py-1.5 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Stats tiles */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-[11px] uppercase tracking-wider text-gray-400 mb-1">Database Size</div>
            <div className="text-2xl font-bold text-gray-900">{overview.database_size ?? '-'}</div>
            <div className="text-xs text-gray-400 mt-1">PostgreSQL {overview.pg_version}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-[11px] uppercase tracking-wider text-gray-400 mb-1">Tables</div>
            <div className="text-2xl font-bold text-gray-900">{overview.total_tables ?? '-'}</div>
            <div className="text-xs text-gray-400 mt-1">{overview.total_indexes ?? '-'} indexes</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-[11px] uppercase tracking-wider text-gray-400 mb-1">Cache Hit Ratio</div>
            <div className={`text-2xl font-bold ${overview.cache_hit_ratio != null ? (overview.cache_hit_ratio >= 99 ? 'text-green-600' : overview.cache_hit_ratio >= 95 ? 'text-amber-600' : 'text-red-600') : 'text-gray-900'}`}>
              {overview.cache_hit_ratio != null ? `${overview.cache_hit_ratio}%` : '-'}
            </div>
            <div className="text-xs text-gray-400 mt-1">buffer cache</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-[11px] uppercase tracking-wider text-gray-400 mb-1">Connections</div>
            <div className="text-2xl font-bold text-gray-900">
              {overview.active_connections ?? '-'} / {overview.max_connections ?? '?'}
            </div>
            <div className="text-xs text-gray-400 mt-1">current / max</div>
          </div>
        </div>
      )}

      {/* Health Assessment — metric status cards */}
      {metrics.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Health Assessment</h2>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {metrics.map((m: any) => {
              const cfg = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.in_range;
              return (
                <div key={m.key} className={`rounded-lg border p-3 ${cfg.bg} border-opacity-50`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-block w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className={`text-xs font-semibold uppercase tracking-wide ${cfg.text}`}>{cfg.label}</span>
                  </div>
                  <div className="text-sm font-medium text-gray-800">{m.label}</div>
                  <div className="text-lg font-bold text-gray-900 mt-0.5">{m.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{m.detail}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Findings panel */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-700">Findings</h2>
            {sevFilter && (
              <button onClick={() => { setSevFilter(null); setExpandedIdx(null); }} className="text-xs text-blue-600 hover:underline">
                Clear filter
              </button>
            )}
          </div>
          {Object.keys(sevCounts).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {['critical', 'high', 'medium', 'low', 'info'].map(sev => {
                const count = sevCounts[sev];
                if (!count) return null;
                const active = sevFilter === sev;
                return (
                  <button
                    key={sev}
                    onClick={() => { setSevFilter(active ? null : sev); setExpandedIdx(null); }}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium transition-all ${SEV_COLORS[sev] ?? ''} ${active ? 'ring-2 ring-offset-1 ring-blue-400 scale-105' : 'opacity-80 hover:opacity-100'}`}
                  >
                    {sev}: {count}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="p-4">
          {findings.length === 0 && !loading ? (
            <div className="p-4 rounded border border-green-200 bg-green-50 text-green-700 text-sm text-center">
              All checks passed &mdash; no issues detected
            </div>
          ) : (() => {
            const filtered = sevFilter ? findings.filter(f => f.severity === sevFilter) : findings;
            return (
              <div className="space-y-1">
                <div className="text-xs text-gray-400 mb-2">
                  {sevFilter ? `Showing ${filtered.length} ${sevFilter} findings` : `${findings.length} findings`}
                  {' — click a row to expand details'}
                </div>
                {filtered.map((f, i) => {
                  const globalIdx = findings.indexOf(f);
                  const isExpanded = expandedIdx === globalIdx;
                  return (
                    <div key={`${f.check_id}-${globalIdx}`}>
                      <button
                        onClick={() => setExpandedIdx(isExpanded ? null : globalIdx)}
                        className={`w-full flex flex-wrap items-start gap-2 p-2 rounded border text-sm text-left transition-colors ${isExpanded ? 'border-blue-200 bg-blue-50/50' : 'border-gray-100 hover:bg-gray-50'}`}
                      >
                        <span className="shrink-0 text-gray-400 text-xs mt-0.5">{isExpanded ? '▼' : '▶'}</span>
                        <span className={`shrink-0 inline-block px-2 py-0.5 rounded-full border text-xs font-medium ${SEV_COLORS[f.severity] ?? SEV_COLORS.info}`}>
                          {f.severity}
                        </span>
                        <span className="font-mono text-xs text-gray-500 shrink-0">{f.check_id}</span>
                        {f.object_name && <span className="font-medium text-gray-800">{f.object_name}</span>}
                        <span className="text-gray-600 flex-1">{f.detail}</span>
                      </button>
                      {isExpanded && (
                        <div className="ml-6 mt-1 mb-2 p-3 rounded bg-gray-50 border border-gray-100 text-xs space-y-1.5">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <div><span className="text-gray-400">Check:</span> <span className="font-mono text-gray-700">{f.check_id}</span></div>
                            <div><span className="text-gray-400">Category:</span> <span className="text-gray-700">{f.category}</span></div>
                            <div><span className="text-gray-400">Object:</span> <span className="font-mono text-gray-700">{f.object_name}</span></div>
                            <div><span className="text-gray-400">Severity:</span> <span className={`font-medium ${f.severity === 'critical' ? 'text-red-700' : f.severity === 'high' ? 'text-orange-700' : 'text-gray-700'}`}>{f.severity}</span></div>
                            {f.actual_value != null && (
                              <div><span className="text-gray-400">Actual:</span> <span className="font-mono text-gray-700">{f.actual_value}</span></div>
                            )}
                            {f.threshold != null && (
                              <div><span className="text-gray-400">Threshold:</span> <span className="font-mono text-gray-700">{f.threshold}</span></div>
                            )}
                          </div>
                          <div className="pt-1 border-t border-gray-200">
                            <span className="text-gray-400">Detail:</span> <span className="text-gray-700">{f.detail}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex border-b border-gray-200">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === t.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-4">
          {activeTab === 'tables' && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wider text-gray-400">
                    <th className="py-2 pr-3">Schema.Table</th>
                    <th className="py-2 pr-3">Total Size</th>
                    <th className="py-2 pr-3">Heap</th>
                    <th className="py-2 pr-3">Index</th>
                    <th className="py-2 pr-3 text-right">Live Rows</th>
                    <th className="py-2 pr-3 text-right">Dead %</th>
                    <th className="py-2 pr-3 text-right">Ins</th>
                    <th className="py-2 pr-3 text-right">Upd</th>
                    <th className="py-2 pr-3 text-right">Del</th>
                    <th className="py-2 pr-3 text-right">Seq</th>
                    <th className="py-2 pr-3 text-right">Idx</th>
                    <th className="py-2 pr-3">Last Vacuum</th>
                  </tr>
                </thead>
                <tbody>
                  {tables.map((t, i) => {
                    const dead = t.dead_pct != null ? Number(t.dead_pct) : 0;
                    return (
                      <tr key={`${t.schemaname}-${t.relname}-${i}`} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-1.5 pr-3 font-mono text-xs">{t.schemaname}.{t.relname}</td>
                        <td className="py-1.5 pr-3">{t.total_size}</td>
                        <td className="py-1.5 pr-3">{t.heap_size}</td>
                        <td className="py-1.5 pr-3">{t.index_size}</td>
                        <td className="py-1.5 pr-3 text-right">{Number(t.live_rows).toLocaleString()}</td>
                        <td className={`py-1.5 pr-3 text-right font-medium ${deadColor(dead)}`}>
                          {t.dead_pct != null ? `${t.dead_pct}%` : '-'}
                        </td>
                        <td className="py-1.5 pr-3 text-right">{Number(t.inserts).toLocaleString()}</td>
                        <td className="py-1.5 pr-3 text-right">{Number(t.updates).toLocaleString()}</td>
                        <td className="py-1.5 pr-3 text-right">{Number(t.deletes).toLocaleString()}</td>
                        <td className="py-1.5 pr-3 text-right">{Number(t.seq_scan).toLocaleString()}</td>
                        <td className="py-1.5 pr-3 text-right">{Number(t.idx_scan).toLocaleString()}</td>
                        <td className="py-1.5 pr-3 text-xs text-gray-400">
                          {t.last_autovacuum
                            ? new Date(t.last_autovacuum).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
                            : '-'}
                        </td>
                      </tr>
                    );
                  })}
                  {tables.length === 0 && !loading && (
                    <tr><td colSpan={12} className="py-4 text-center text-gray-400">No table data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'connections' && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wider text-gray-400">
                    <th className="py-2 pr-3">State</th>
                    <th className="py-2 pr-3 text-right">Count</th>
                    <th className="py-2 pr-3 text-right">Longest (sec)</th>
                  </tr>
                </thead>
                <tbody>
                  {connections.map((c, i) => (
                    <tr key={`${c.state}-${i}`} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-1.5 pr-3 font-medium">{c.state ?? 'unknown'}</td>
                      <td className="py-1.5 pr-3 text-right">{c.count}</td>
                      <td className="py-1.5 pr-3 text-right text-xs text-gray-500">
                        {c.longest_seconds != null ? `${Number(c.longest_seconds).toLocaleString()}s` : '-'}
                      </td>
                    </tr>
                  ))}
                  {connections.length === 0 && !loading && (
                    <tr><td colSpan={3} className="py-4 text-center text-gray-400">No connection data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'extensions' && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wider text-gray-400">
                    <th className="py-2 pr-3">Extension</th>
                    <th className="py-2 pr-3">Default Version</th>
                    <th className="py-2 pr-3">Installed</th>
                  </tr>
                </thead>
                <tbody>
                  {extensions.map((e, i) => (
                    <tr key={`${e.name}-${i}`} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-1.5 pr-3 font-medium">{e.name}</td>
                      <td className="py-1.5 pr-3 text-xs">{e.default_version ?? '-'}</td>
                      <td className="py-1.5 pr-3 text-xs">
                        {e.installed_version
                          ? <span className="text-green-600">{e.installed_version}</span>
                          : <span className="text-red-600 font-medium">NOT INSTALLED</span>
                        }
                      </td>
                    </tr>
                  ))}
                  {extensions.length === 0 && !loading && (
                    <tr><td colSpan={3} className="py-4 text-center text-gray-400">No extension data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'trend' && (
            <div className="space-y-4">
              {snapshots.length > 0 && (
                <div className="flex items-end gap-1 h-32 border-b border-gray-200 pb-2">
                  {snapshots.slice().reverse().map((s, i) => {
                    const total = s.total_tables || 1;
                    const urgentH = Math.round((s.urgent_count / total) * 100);
                    const monitorH = Math.round((s.monitor_count / total) * 100);
                    const healthyH = 100 - urgentH - monitorH;
                    return (
                      <div key={s.id} className="flex-1 flex flex-col items-center gap-0.5 group" title={`${new Date(s.captured_at).toLocaleDateString()} — ${s.summary}`}>
                        <div className="w-full flex flex-col" style={{ height: '100px' }}>
                          <div className="bg-green-400 rounded-t-sm" style={{ height: `${healthyH}%` }} />
                          <div className="bg-amber-400" style={{ height: `${monitorH}%` }} />
                          <div className="bg-red-400 rounded-b-sm" style={{ height: `${urgentH}%` }} />
                        </div>
                        <div className="text-[8px] text-gray-400 group-hover:text-gray-600 truncate w-full text-center">
                          {new Date(s.captured_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-green-400" /> Healthy</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-amber-400" /> Monitor</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-red-400" /> Urgent</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wider text-gray-400">
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Type</th>
                      <th className="py-2 pr-3 text-right">Tables</th>
                      <th className="py-2 pr-3 text-right">Urgent</th>
                      <th className="py-2 pr-3 text-right">Monitor</th>
                      <th className="py-2 pr-3 text-right">Healthy</th>
                      <th className="py-2 pr-3 text-right">Findings</th>
                      <th className="py-2 pr-3 text-right">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshots.map(s => (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-1.5 pr-3 text-xs">{new Date(s.captured_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                        <td className="py-1.5 pr-3">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${s.run_type === 'manual' ? 'bg-blue-50 text-blue-600' : s.run_type === 'startup' ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>
                            {s.run_type}
                          </span>
                        </td>
                        <td className="py-1.5 pr-3 text-right">{s.total_tables}</td>
                        <td className="py-1.5 pr-3 text-right font-medium text-red-600">{s.urgent_count}</td>
                        <td className="py-1.5 pr-3 text-right text-amber-600">{s.monitor_count}</td>
                        <td className="py-1.5 pr-3 text-right text-green-600">{s.in_range_count}</td>
                        <td className="py-1.5 pr-3 text-right">{s.finding_count}</td>
                        <td className="py-1.5 pr-3 text-right text-xs text-gray-400">{s.duration_ms}ms</td>
                      </tr>
                    ))}
                    {snapshots.length === 0 && !loading && (
                      <tr><td colSpan={8} className="py-4 text-center text-gray-400">No audit history — click "Run Audit Now" to capture the first snapshot</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'jobs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-400">Last 20 pg_cron job runs for BOP jobs</div>
                <button
                  onClick={() => { setFetched(prev => ({ ...prev, jobs: false })); loadTab('jobs'); }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Reload
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wider text-gray-400">
                      <th className="py-2 pr-3">Job</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Started</th>
                      <th className="py-2 pr-3">Duration</th>
                      <th className="py-2 pr-3">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cronJobs.map((j, i) => {
                      const start = j.start_time ? new Date(j.start_time) : null;
                      const end = j.end_time ? new Date(j.end_time) : null;
                      const durationMs = start && end ? end.getTime() - start.getTime() : null;
                      const isSuccess = j.status === 'succeeded';
                      const isFailed = j.status === 'failed';
                      return (
                        <tr key={`${j.jobid}-${i}`} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-1.5 pr-3">
                            <div className="font-medium text-gray-800">{j.jobname}</div>
                            <div className="text-[10px] text-gray-400 font-mono truncate max-w-[300px]" title={j.command}>{j.command}</div>
                          </td>
                          <td className="py-1.5 pr-3">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                              isSuccess ? 'bg-green-50 text-green-600' :
                              isFailed ? 'bg-red-50 text-red-600' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {j.status}
                            </span>
                          </td>
                          <td className="py-1.5 pr-3 text-xs text-gray-500">
                            {start ? start.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' }) : '-'}
                          </td>
                          <td className="py-1.5 pr-3 text-xs text-gray-500">
                            {durationMs !== null ? (durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`) : '-'}
                          </td>
                          <td className="py-1.5 pr-3 text-xs">
                            <span className={isFailed ? 'text-red-600' : 'text-gray-400'}>{j.return_message || '-'}</span>
                          </td>
                        </tr>
                      );
                    })}
                    {cronJobs.length === 0 && !loading && (
                      <tr><td colSpan={5} className="py-4 text-center text-gray-400">No background job history found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-[slideUp_0.3s_ease-out] bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg text-sm flex items-center gap-3">
          <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
          {toast}
          <button onClick={() => setToast(null)} className="text-gray-400 hover:text-white ml-2">&times;</button>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
