'use client';
import { useState, useEffect, useMemo } from 'react';
import { BopSelect } from '@/components/BopSelect';
import { ScreenHeader } from '@/components/ScreenBadge';

const STATUS_COLOR: Record<string, string> = {
  committed: 'bg-blue-100 text-blue-700',
  merged:    'bg-violet-100 text-violet-700',
  released:  'bg-emerald-100 text-emerald-700',
  deployed:  'bg-green-100 text-green-700',
  archived:  'bg-slate-100 text-slate-400',
};

function riskColor(score: number) {
  if (score >= 4) return 'font-bold text-red-600';
  if (score >= 3) return 'font-bold text-amber-600';
  return 'text-slate-400';
}

function fmt(ts: string) {
  return new Date(ts).toLocaleString('nl-NL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

type SortDir = 'asc' | 'desc';
type SortCol = 'hash' | 'repo' | 'branch' | 'author' | 'message' | 'risk_score' | 'has_migration' | 'status' | 'committed_at' | 'updated_at';

function SortIcon({ col, sortCol, sortDir }: { col: SortCol; sortCol: SortCol; sortDir: SortDir }) {
  if (col !== sortCol) return (
    <svg className="inline-block ml-0.5 h-3 w-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
  return sortDir === 'asc' ? (
    <svg className="inline-block ml-0.5 h-3 w-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  ) : (
    <svg className="inline-block ml-0.5 h-3 w-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export default function CommitsPage() {
  const [commits, setCommits]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Filters
  const [fStatus,  setFStatus]  = useState('');
  const [fBranch,  setFBranch]  = useState('');
  const [fRepo,    setFRepo]    = useState('');
  const [fAuthor,  setFAuthor]  = useState('');
  const [fRisk,    setFRisk]    = useState('');

  // Sort
  const [sortCol, setSortCol] = useState<SortCol>('committed_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  function load() {
    setLoading(true);
    fetch('/api/bop/dev/commits?limit=200')
      .then(r => r.json())
      .then(d => { setCommits(d.commits ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  }

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const filtered = useMemo(() => {
    let rows = commits;
    if (fStatus) rows = rows.filter(c => c.status === fStatus);
    if (fBranch) rows = rows.filter(c => (c.branch ?? '').toLowerCase().includes(fBranch.toLowerCase()));
    if (fRepo)   rows = rows.filter(c => (c.repo ?? '').toLowerCase().includes(fRepo.toLowerCase()));
    if (fAuthor) rows = rows.filter(c => (c.author ?? '').toLowerCase().includes(fAuthor.toLowerCase()));
    if (fRisk === '3+') rows = rows.filter(c => (c.risk_score ?? 0) >= 3);
    if (fRisk === '4+') rows = rows.filter(c => (c.risk_score ?? 0) >= 4);
    if (fRisk === 'mig') rows = rows.filter(c => c.has_migration);

    rows = [...rows].sort((a, b) => {
      let av: any, bv: any;
      switch (sortCol) {
        case 'risk_score':    av = a.risk_score ?? 0;      bv = b.risk_score ?? 0;      break;
        case 'has_migration': av = a.has_migration ? 1 : 0; bv = b.has_migration ? 1 : 0; break;
        case 'committed_at':  av = a.committed_at ?? '';   bv = b.committed_at ?? '';   break;
        case 'updated_at':    av = a.updated_at ?? '';     bv = b.updated_at ?? '';     break;
        default:              av = (a[sortCol] ?? '').toString().toLowerCase();
                              bv = (b[sortCol] ?? '').toString().toLowerCase();
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [commits, fStatus, fBranch, fRepo, fAuthor, fRisk, sortCol, sortDir]);

  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thisWeek   = commits.filter(c => new Date(c.committed_at).getTime() > weekAgo).length;
  const migrations = commits.filter(c => c.has_migration).length;
  const highRisk   = commits.filter(c => (c.risk_score ?? 0) >= 4).length;

  const repos = [...new Set(commits.map(c => c.repo).filter(Boolean))].sort();

  function Th({ col, label }: { col: SortCol; label: string }) {
    return (
      <th onClick={() => toggleSort(col)}
        className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer select-none hover:text-slate-600 whitespace-nowrap">
        {label}<SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
      </th>
    );
  }

  return (
    <div className="p-6">
      <ScreenHeader title="Commits" description="DV004 — Git commit trace linked to enhancements and releases" />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Commits',  value: commits.length, color: 'text-slate-800' },
          { label: 'This Week',      value: thisWeek,       color: 'text-blue-700' },
          { label: 'Has Migration',  value: migrations,     color: 'text-amber-700' },
          { label: 'High Risk (>=4)', value: highRisk,      color: 'text-red-600' },
        ].map(c => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{c.label}</p>
            <p className={`mt-1 text-2xl font-bold ${c.color}`}>{loading ? '—' : c.value}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 shadow-sm">
        <div className="relative">
          <BopSelect value={fStatus} onChange={v => setFStatus(v)} options={[{ value: String(''), label: `All statuses` }, ...['committed','merged','released','deployed','archived'].map((s) => ({ value: String(s), label: `${s[0].toUpperCase() + s.slice(1)}` }))]} className="min-w-[130px]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
            <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        <div className="relative">
          <BopSelect value={fRepo} onChange={v => setFRepo(v)} options={[{ value: String(''), label: `All repos` }, ...repos.map((r) => ({ value: String(r), label: `${r}` }))]} className="min-w-[130px]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
            <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        <input type="text" placeholder="Branch..." value={fBranch} onChange={e => setFBranch(e.target.value)}
          className="w-32 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-shadow hover:shadow" />
        <input type="text" placeholder="Author..." value={fAuthor} onChange={e => setFAuthor(e.target.value)}
          className="w-32 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-shadow hover:shadow" />
        <div className="relative">
          <BopSelect value={fRisk} onChange={v => setFRisk(v)} options={[{ value: String(''), label: `All risk` }, { value: String('3+'), label: `Risk &gt;= 3` }, { value: String('4+'), label: `Risk &gt;= 4 (High)` }, { value: String('mig'), label: `Has Migration` }]} className="min-w-[130px]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
            <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {(fStatus || fBranch || fRepo || fAuthor || fRisk) && (
          <button onClick={() => { setFStatus(''); setFBranch(''); setFRepo(''); setFAuthor(''); setFRisk(''); }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-500 shadow-sm hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors">
            Clear
          </button>
        )}
        <span className="ml-auto text-xs text-slate-400">{filtered.length} of {commits.length}</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
            <p className="font-medium text-slate-500">No commits match filters</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 w-6"></th>
                <Th col="hash"        label="Hash" />
                <Th col="repo"        label="Repo" />
                <Th col="branch"      label="Branch" />
                <Th col="author"      label="Author" />
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Message</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Enhancement</th>
                <Th col="risk_score"    label="Risk" />
                <Th col="has_migration" label="Mig" />
                <Th col="status"        label="Status" />
                <Th col="committed_at"  label="Committed" />
                <Th col="updated_at"    label="Updated" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c: any) => {
                const expanded = expandedIds.has(c.id);
                const files: string[] = (() => {
                  try {
                    const f = c.files_changed;
                    if (!f) return [];
                    const parsed = typeof f === 'string' ? JSON.parse(f) : f;
                    if (Array.isArray(parsed)) return parsed.map((x: any) => typeof x === 'string' ? x : (x.path ?? x.filename ?? JSON.stringify(x)));
                    return [];
                  } catch { return []; }
                })();
                return [
                  <tr key={c.id} onClick={() => toggleExpand(c.id)}
                    className={`cursor-pointer transition-colors ${expanded ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      <svg className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{(c.hash ?? '').slice(0,7)}</td>
                    <td className="px-4 py-3">
                      {c.repo ? <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[11px] text-indigo-700">{c.repo}</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">{c.branch}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{c.author}</td>
                    <td className="max-w-[200px] px-4 py-3 text-slate-700 text-xs" title={c.message}>
                      <span className="block truncate">{c.message}</span>
                    </td>
                    <td className="px-4 py-3">
                      {c.dev_enhancements
                        ? <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700">{c.dev_enhancements.code}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${riskColor(c.risk_score ?? 0)}`}>{c.risk_score ?? 0}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.has_migration ? <span className="text-amber-500">✓</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[c.status] ?? 'bg-slate-100 text-slate-500'}`}>
                        {c.status ?? 'committed'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{c.committed_at ? fmt(c.committed_at) : '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {c.updated_at
                        ? <span className="text-xs font-medium text-blue-600">{fmt(c.updated_at)}</span>
                        : <span className="text-xs text-slate-300">—</span>}
                    </td>
                  </tr>,
                  expanded && (
                    <tr key={c.id + '_exp'} className="bg-blue-50/60">
                      <td colSpan={12} className="px-8 pb-4 pt-1">
                        <div className="rounded-lg border border-blue-100 bg-white p-3">
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            Files changed ({files.length}) · {c.hash} · {c.repo ?? 'unknown repo'} · {c.branch}
                          </p>
                          {files.length === 0 ? (
                            <p className="text-xs text-slate-400">No file data recorded</p>
                          ) : (
                            <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2 lg:grid-cols-3">
                              {files.map((f, i) => (
                                <div key={i} className="flex items-center gap-1.5 rounded px-2 py-1 hover:bg-slate-50">
                                  <svg className="h-3 w-3 shrink-0 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span className="font-mono text-[11px] text-slate-600 truncate" title={f}>{f}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ),
                ];
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
