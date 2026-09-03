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
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [fetched, setFetched] = useState<Record<string, boolean>>({ tables: false, connections: false, extensions: false });

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
        setFetched({ tables: true, connections: false, extensions: false });
        setLastRefresh(new Date());
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  function loadTab(tab: TabKey) {
    if (fetched[tab]) return;
    setLoading(true);
    fetchAction(tab)
      .then(d => {
        if (tab === 'tables')      setTables(d.tables ?? []);
        if (tab === 'connections') setConnections(d.connections ?? []);
        if (tab === 'extensions')  setExtensions(d.extensions ?? []);
        setFetched(prev => ({ ...prev, [tab]: true }));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  function refreshAll() {
    setFetched({ tables: false, connections: false, extensions: false });
    loadInitial();
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
        <button
          onClick={refreshAll}
          disabled={loading}
          className="px-3 py-1.5 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
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
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Findings</h2>
          {Object.keys(sevCounts).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {['critical', 'high', 'medium', 'low', 'info'].map(sev => {
                const count = sevCounts[sev];
                if (!count) return null;
                return (
                  <span
                    key={sev}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${SEV_COLORS[sev] ?? ''}`}
                  >
                    {sev}: {count}
                  </span>
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
          ) : (
            <div className="space-y-2">
              {findings.map((f, i) => (
                <div key={`${f.check_id}-${i}`} className="flex flex-wrap items-start gap-2 p-2 rounded border border-gray-100 hover:bg-gray-50 text-sm">
                  <span className={`shrink-0 inline-block px-2 py-0.5 rounded-full border text-xs font-medium ${SEV_COLORS[f.severity] ?? SEV_COLORS.info}`}>
                    {f.severity}
                  </span>
                  <span className="font-mono text-xs text-gray-500 shrink-0">{f.check_id}</span>
                  {f.object_name && <span className="font-medium text-gray-800">{f.object_name}</span>}
                  <span className="text-gray-600 flex-1">{f.detail}</span>
                  {(f.actual_value != null || f.threshold != null) && (
                    <span className="text-xs text-gray-400 shrink-0">
                      {f.actual_value != null && <>actual: <span className="font-mono">{f.actual_value}</span></>}
                      {f.actual_value != null && f.threshold != null && ' / '}
                      {f.threshold != null && <>threshold: <span className="font-mono">{f.threshold}</span></>}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
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
                          {t.last_autovacuum ? new Date(t.last_autovacuum).toLocaleDateString() : '-'}
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
        </div>
      </div>
    </div>
  );
}
