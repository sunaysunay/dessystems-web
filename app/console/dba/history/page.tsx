'use client';
import React, { useEffect, useState } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

interface LogRow {
  id: number;
  executed_at: string;
  user_id: string;
  user_email: string | null;
  statement_class: string;
  sql_hash: string;
  sql_text: string;
  execution_ms: number | null;
  rows_affected: number | null;
  was_dry_run: boolean;
  was_committed: boolean;
  error_message: string | null;
  pg_role_used: string;
  client_ip: string | null;
  user_agent: string | null;
}

interface Stats {
  total: number;
  avg_ms: number | null;
  by_class: Record<string, number>;
}

const CLASS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'select', label: 'SELECT' },
  { key: 'insert', label: 'INSERT' },
  { key: 'update', label: 'UPDATE' },
  { key: 'delete', label: 'DELETE' },
  { key: 'ddl', label: 'DDL' },
];

const RANGE_FILTERS = [
  { key: '1h', label: 'Last 1h' },
  { key: '24h', label: 'Last 24h' },
  { key: '7d', label: 'Last 7d' },
  { key: '30d', label: 'Last 30d' },
  { key: 'all', label: 'All' },
];

const CLASS_COLORS: Record<string, string> = {
  select: 'bg-green-50 text-green-700 border-green-200',
  insert: 'bg-blue-50 text-blue-700 border-blue-200',
  update: 'bg-amber-50 text-amber-700 border-amber-200',
  delete: 'bg-red-50 text-red-700 border-red-200',
  ddl: 'bg-purple-50 text-purple-700 border-purple-200',
  other: 'bg-gray-50 text-gray-600 border-gray-200',
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.round((then - now) / 1000);
  const abs = Math.abs(diffSec);

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
  ];

  try {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    for (const [unit, secs] of units) {
      if (abs >= secs || unit === 'second') {
        const value = Math.round(diffSec / secs);
        return rtf.format(value, unit);
      }
    }
  } catch {
    // fallback below
  }
  if (abs < 60) return `${abs}s ago`;
  if (abs < 3600) return `${Math.floor(abs / 60)}m ago`;
  if (abs < 86400) return `${Math.floor(abs / 3600)}h ago`;
  return `${Math.floor(abs / 86400)}d ago`;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '…';
}

export default function DB007Page() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);

  const [classFilter, setClassFilter] = useState('all');
  const [rangeFilter, setRangeFilter] = useState('24h');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [userFilter, setUserFilter] = useState('');

  const [stats, setStats] = useState<Stats | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function loadData(p: number, cls: string, range: string, srch: string, usr: string) {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      action: 'history',
      page: String(p),
      limit: String(limit),
      range,
    });
    if (cls !== 'all') params.set('class', cls);
    if (srch) params.set('search', srch);
    if (usr) params.set('user', usr);

    fetch(`/api/bop/dba/sql?${params}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setRows(d.history ?? []);
        setTotal(d.total ?? 0);
        setPages(d.pages ?? 1);
        setPage(d.page ?? 1);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }

  function loadStats(range: string, cls: string, srch: string, usr: string) {
    const params = new URLSearchParams({ action: 'history_stats', range });
    if (cls !== 'all') params.set('class', cls);
    if (srch) params.set('search', srch);
    if (usr) params.set('user', usr);

    fetch(`/api/bop/dba/sql?${params}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setStats(d);
      })
      .catch(() => {
        // history_stats endpoint unavailable — fall back to computing from the current page.
        computeStatsFromRows();
      });
  }

  function computeStatsFromRows() {
    if (rows.length === 0) {
      setStats({ total: 0, avg_ms: null, by_class: {} });
      return;
    }
    const byClass: Record<string, number> = {};
    let sumMs = 0;
    let countMs = 0;
    for (const r of rows) {
      byClass[r.statement_class] = (byClass[r.statement_class] ?? 0) + 1;
      if (r.execution_ms !== null && r.execution_ms !== undefined) {
        sumMs += r.execution_ms;
        countMs++;
      }
    }
    setStats({
      total,
      avg_ms: countMs > 0 ? sumMs / countMs : null,
      by_class: byClass,
    });
  }

  useEffect(() => {
    loadData(1, classFilter, rangeFilter, search, userFilter);
    loadStats(rangeFilter, classFilter, search, userFilter);
  }, [classFilter, rangeFilter, search, userFilter]);

  function handleClassFilter(cls: string) {
    setClassFilter(cls);
    setExpanded(null);
  }

  function handleRangeFilter(range: string) {
    setRangeFilter(range);
    setExpanded(null);
  }

  function handleSearch() {
    setSearch(searchInput);
    setExpanded(null);
  }

  function handlePage(p: number) {
    if (p < 1 || p > pages) return;
    loadData(p, classFilter, rangeFilter, search, userFilter);
    setExpanded(null);
  }

  function toggleExpand(id: number) {
    setExpanded(expanded === id ? null : id);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <ScreenHeader />

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}

      {/* Stats bar */}
      <div className="border rounded-lg p-3 flex flex-wrap items-center gap-4 text-sm bg-gray-50">
        <div>
          <span className="text-gray-500">Total queries: </span>
          <span className="font-semibold">{(stats?.total ?? total).toLocaleString()}</span>
        </div>
        <div className="flex gap-2">
          {CLASS_FILTERS.filter(c => c.key !== 'all').map(c => (
            <span key={c.key} className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${CLASS_COLORS[c.key] ?? CLASS_COLORS.other}`}>
              {c.label}: {stats?.by_class?.[c.key] ?? 0}
            </span>
          ))}
        </div>
        <div className="ml-auto">
          <span className="text-gray-500">Avg execution: </span>
          <span className="font-semibold">
            {stats?.avg_ms !== null && stats?.avg_ms !== undefined ? `${stats.avg_ms.toFixed(1)} ms` : '—'}
          </span>
        </div>
      </div>

      {/* Filters toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {CLASS_FILTERS.map(c => (
            <button
              key={c.key}
              onClick={() => handleClassFilter(c.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                classFilter === c.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          {RANGE_FILTERS.map(r => (
            <button
              key={r.key}
              onClick={() => handleRangeFilter(r.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                rangeFilter === r.key
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <input
          type="text"
          placeholder="Search SQL text..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          className="border rounded px-2 py-1 text-sm w-56"
        />
        <input
          type="text"
          placeholder="Filter by user..."
          value={userFilter}
          onChange={e => setUserFilter(e.target.value)}
          className="border rounded px-2 py-1 text-sm w-40"
        />
        <button onClick={handleSearch} className="border rounded px-3 py-1 text-sm hover:bg-gray-50">Search</button>
      </div>

      {/* Query log table */}
      {loading ? (
        <div className="p-4 text-sm text-gray-500">Loading...</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b text-left">
                  <th className="p-2 font-medium text-xs w-14">#</th>
                  <th className="p-2 font-medium text-xs w-28">Time</th>
                  <th className="p-2 font-medium text-xs w-20">Class</th>
                  <th className="p-2 font-medium text-xs">SQL</th>
                  <th className="p-2 font-medium text-xs w-16 text-right">Rows</th>
                  <th className="p-2 font-medium text-xs w-20 text-right">Time</th>
                  <th className="p-2 font-medium text-xs w-24">Role</th>
                  <th className="p-2 font-medium text-xs w-12 text-center">Dry</th>
                  <th className="p-2 font-medium text-xs w-16 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={9} className="p-6 text-center text-gray-400">No queries found</td></tr>
                ) : rows.map(row => (
                  <React.Fragment key={row.id}>
                    <tr
                      onClick={() => toggleExpand(row.id)}
                      className={`border-b hover:bg-gray-50 cursor-pointer ${expanded === row.id ? 'bg-blue-50/50' : ''}`}
                    >
                      <td className="p-2 text-xs text-gray-400 font-mono">{row.id}</td>
                      <td className="p-2 text-xs text-gray-600" title={new Date(row.executed_at).toLocaleString()}>
                        {relativeTime(row.executed_at)}
                      </td>
                      <td className="p-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium uppercase ${CLASS_COLORS[row.statement_class] ?? CLASS_COLORS.other}`}>
                          {row.statement_class}
                        </span>
                      </td>
                      <td className="p-2 font-mono text-xs text-gray-700">
                        {truncate(row.sql_text.replace(/\s+/g, ' '), 80)}
                      </td>
                      <td className="p-2 text-xs text-right text-gray-600">{row.rows_affected ?? '—'}</td>
                      <td className="p-2 text-xs text-right text-gray-600">
                        {row.execution_ms !== null && row.execution_ms !== undefined ? `${row.execution_ms} ms` : '—'}
                      </td>
                      <td className="p-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                          {row.pg_role_used}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        {row.was_dry_run ? <span className="text-amber-500" title="Dry run">●</span> : <span className="text-gray-200">—</span>}
                      </td>
                      <td className="p-2 text-center">
                        {row.was_committed
                          ? <span className="text-green-600" title="Committed">✓</span>
                          : <span className="text-red-500" title="Not committed">✕</span>}
                      </td>
                    </tr>
                    {expanded === row.id && (
                      <tr className="border-b bg-gray-50/70">
                        <td colSpan={9} className="p-3">
                          <div className="space-y-2">
                            <div>
                              <div className="text-[10px] uppercase text-gray-400 font-medium mb-1">Full SQL</div>
                              <pre className="bg-white border rounded p-3 text-xs font-mono whitespace-pre-wrap break-all overflow-x-auto">
                                {row.sql_text}
                              </pre>
                            </div>
                            {row.error_message && (
                              <div>
                                <div className="text-[10px] uppercase text-red-400 font-medium mb-1">Error</div>
                                <pre className="bg-red-50 border border-red-200 text-red-700 rounded p-2 text-xs font-mono whitespace-pre-wrap">
                                  {row.error_message}
                                </pre>
                              </div>
                            )}
                            <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                              <span><span className="text-gray-400">User: </span>{row.user_email ?? '—'}</span>
                              <span><span className="text-gray-400">IP: </span>{row.client_ip ?? '—'}</span>
                              <span><span className="text-gray-400">Hash: </span><span className="font-mono">{row.sql_hash}</span></span>
                              <span><span className="text-gray-400">Executed: </span>{new Date(row.executed_at).toLocaleString()}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center gap-2 justify-between text-sm">
        <span className="text-gray-500">
          Page {page} of {pages} ({total.toLocaleString()} queries)
        </span>
        <div className="flex gap-1">
          <button onClick={() => handlePage(1)} disabled={page === 1} className="border rounded px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-30">First</button>
          <button onClick={() => handlePage(page - 1)} disabled={page === 1} className="border rounded px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-30">Prev</button>
          <button onClick={() => handlePage(page + 1)} disabled={page === pages} className="border rounded px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-30">Next</button>
          <button onClick={() => handlePage(pages)} disabled={page === pages} className="border rounded px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-30">Last</button>
        </div>
      </div>
    </div>
  );
}
