'use client';
import { useState, useEffect, useMemo } from 'react';
import { BopSelect } from '@/components/BopSelect';
import { ScreenHeader } from '@/components/ScreenBadge';

const COMMIT_STATUS_COLOR: Record<string, string> = {
  committed: 'bg-blue-100 text-blue-700',
  merged:    'bg-violet-100 text-violet-700',
  released:  'bg-emerald-100 text-emerald-700',
  deployed:  'bg-green-100 text-green-700',
  archived:  'bg-slate-100 text-slate-400',
};

const ENV_DOT: Record<string, string> = {
  prod: 'bg-emerald-500',
  qa:   'bg-violet-500',
  dev:  'bg-blue-500',
};

function fmt(ts: string) {
  return new Date(ts).toLocaleString('nl-NL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

type SortDir = 'asc' | 'desc';
type SortCol = 'hash' | 'repo' | 'branch' | 'author' | 'message' | 'risk_score' | 'has_migration' | 'status' | 'committed_at' | 'updated_at';

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return (
    <svg className="inline-block ml-0.5 h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
  return dir === 'asc' ? (
    <svg className="inline-block ml-0.5 h-3 w-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  ) : (
    <svg className="inline-block ml-0.5 h-3 w-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function sortRows(rows: any[], col: SortCol, dir: SortDir) {
  return [...rows].sort((a, b) => {
    let av: any, bv: any;
    switch (col) {
      case 'risk_score':    av = a.risk_score ?? 0;       bv = b.risk_score ?? 0;       break;
      case 'has_migration': av = a.has_migration ? 1 : 0; bv = b.has_migration ? 1 : 0; break;
      case 'committed_at':  av = a.committed_at ?? '';    bv = b.committed_at ?? '';    break;
      case 'updated_at':    av = a.updated_at ?? '';      bv = b.updated_at ?? '';      break;
      default:              av = (a[col] ?? '').toString().toLowerCase();
                            bv = (b[col] ?? '').toString().toLowerCase();
    }
    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

export default function ProductionQueuePage() {
  const [commits, setCommits]           = useState<any[]>([]);
  const [envStates, setEnvStates]       = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [updatingCommit, setUpdatingCommit] = useState<string | null>(null);

  // Selection
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());

  const [showDeploy, setShowDeploy]     = useState(false);
  const [deploying, setDeploying]       = useState(false);
  const [deployLog, setDeployLog]       = useState('');
  const [deployDone, setDeployDone]     = useState(false);
  const [deployOk, setDeployOk]         = useState(false);

  // Filters
  const [fBranch, setFBranch] = useState('');
  const [fRepo,   setFRepo]   = useState('');
  const [fAuthor, setFAuthor] = useState('');
  const [fRisk,   setFRisk]   = useState('');

  // Sort (pending)
  const [sortCol, setSortCol]   = useState<SortCol>('committed_at');
  const [sortDir, setSortDir]   = useState<SortDir>('desc');

  // Sort (deployed)
  const [dSortCol, setDSortCol] = useState<SortCol>('committed_at');
  const [dSortDir, setDSortDir] = useState<SortDir>('desc');

  const load = () => {
    setLoading(true);
    void Promise.all([
      fetch('/api/bop/dev/commits?limit=100').then(r => r.json()),
      fetch('/api/bop/dev/environment-states').then(r => r.json()),
    ]).then(([c, env]) => {
      setCommits(c.commits ?? []);
      setEnvStates(env.states ?? []);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const markDeployed = async (ids: string[]) => {
    await Promise.all(ids.map(id =>
      fetch('/api/bop/dev/commits/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'deployed', environment: 'prod' }),
      })
    ));
    setSelectedIds(new Set());
    load();
  };

  const runDeploy = async () => {
    setDeploying(true);
    setDeployLog('Running promote.sh...\n');
    try {
      const res = await fetch('/api/bop/dev/promote', { method: 'POST' });
      const data = await res.json();
      setDeployLog(data.output ?? '(no output)');
      setDeployOk(data.success);
    } catch (err: any) {
      setDeployLog('Network error: ' + err.message);
      setDeployOk(false);
    }
    setDeploying(false);
    setDeployDone(true);
  };

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  }
  function toggleDSort(col: SortCol) {
    if (dSortCol === col) setDSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setDSortCol(col); setDSortDir('asc'); }
  }

  const prodState = envStates.find(e => e.environment === 'prod');
  const qaState   = envStates.find(e => e.environment === 'qa');
  const devState  = envStates.find(e => e.environment === 'dev');

  const repos = [...new Set(commits.map(c => c.repo).filter(Boolean))].sort();

  const allPending = commits.filter(c => c.status !== 'deployed' && c.status !== 'archived');

  const pendingFiltered = useMemo(() => {
    let rows = allPending;
    if (fBranch) rows = rows.filter(c => (c.branch ?? '').toLowerCase().includes(fBranch.toLowerCase()));
    if (fRepo)   rows = rows.filter(c => (c.repo ?? '').toLowerCase().includes(fRepo.toLowerCase()));
    if (fAuthor) rows = rows.filter(c => (c.author ?? '').toLowerCase().includes(fAuthor.toLowerCase()));
    if (fRisk === '3+')  rows = rows.filter(c => (c.risk_score ?? 0) >= 3);
    if (fRisk === '4+')  rows = rows.filter(c => (c.risk_score ?? 0) >= 4);
    if (fRisk === 'mig') rows = rows.filter(c => c.has_migration);
    return sortRows(rows, sortCol, sortDir);
  }, [fBranch, fRepo, fAuthor, fRisk, sortCol, sortDir, allPending]);

  const deployedSorted = useMemo(() => {
    const rows = commits.filter(c => c.status === 'deployed').slice(0, 20);
    return sortRows(rows, dSortCol, dSortDir);
  }, [commits, dSortCol, dSortDir]);

  // Selection helpers
  const visibleIds = pendingFiltered.map(c => c.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        visibleIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        visibleIds.forEach(id => next.add(id));
        return next;
      });
    }
  }

  function toggleOne(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedPending = allPending.filter(c => selectedIds.has(c.id));

  return (
    <div className="p-6 space-y-6">
      <ScreenHeader title="Production Queue" description="DV003 — Release pipeline and deployment tracking" />

      {showDeploy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Deploy to Production</h2>
                <p className="text-xs text-slate-500">{selectedPending.length} commit{selectedPending.length !== 1 ? 's' : ''} selected — runs promote.sh</p>
              </div>
            </div>

            {/* Selected commits summary */}
            {!deployDone && selectedPending.length > 0 && (
              <div className="mb-4 rounded-lg bg-slate-50 border border-slate-200 divide-y divide-slate-100 max-h-36 overflow-y-auto">
                {selectedPending.map(c => (
                  <div key={c.id} className="flex items-center gap-2 px-3 py-2">
                    <span className="font-mono text-xs text-slate-500">{(c.hash ?? '').slice(0,7)}</span>
                    {c.repo && <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[10px] text-indigo-600">{c.repo}</span>}
                    <span className="truncate text-xs text-slate-700">{c.message}</span>
                  </div>
                ))}
              </div>
            )}

            {!deployDone ? (
              <>
                <div className="mb-4 rounded-lg bg-slate-50 p-4 text-xs text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-700">promote.sh steps:</p>
                  <p>1. rsync dev to prod directory</p>
                  <p>2. clear .next build cache</p>
                  <p>3. npm run build (rebuild prod)</p>
                  <p>4. pm2 restart dessystems-console</p>
                </div>
                {deploying && (
                  <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
                    <svg className="h-4 w-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Running promote.sh...
                  </div>
                )}
                <div className="flex gap-3 justify-end">
                  <button onClick={() => { setShowDeploy(false); setDeployLog(''); setDeployDone(false); }}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                  <button onClick={() => { void runDeploy(); }} disabled={deploying}
                    className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                    {deploying ? 'Deploying...' : 'Run promote.sh'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className={`mb-4 rounded-lg border p-3 ${deployOk ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                  <p className={`text-sm font-semibold ${deployOk ? 'text-emerald-700' : 'text-red-700'}`}>
                    {deployOk ? 'Deploy succeeded' : 'Deploy failed'}
                  </p>
                </div>
                <pre className="mb-4 max-h-48 overflow-y-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-200 whitespace-pre-wrap">{deployLog}</pre>
                {deployOk && (
                  <div className="mb-4 text-xs text-slate-500">
                    Mark the {selectedPending.length} selected commit{selectedPending.length !== 1 ? 's' : ''} as deployed?
                  </div>
                )}
                <div className="flex gap-3 justify-end">
                  <button onClick={() => { setShowDeploy(false); setDeployLog(''); setDeployDone(false); load(); }}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Close</button>
                  {deployOk && (
                    <button onClick={() => { void markDeployed(selectedPending.map(c => c.id)); setShowDeploy(false); setDeployLog(''); setDeployDone(false); }}
                      className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                      Mark {selectedPending.length} as Deployed
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Environment banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { env: 'prod', label: 'Production', state: prodState, color: 'border-emerald-200 bg-emerald-50' },
          { env: 'qa',   label: 'QA',         state: qaState,   color: 'border-violet-200 bg-violet-50' },
          { env: 'dev',  label: 'Dev',         state: devState,  color: 'border-blue-200 bg-blue-50' },
        ].map(({ env, label, state, color }) => (
          <div key={env} className={`rounded-xl border p-4 ${color}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`h-2.5 w-2.5 rounded-full ${ENV_DOT[env]}`} />
              <span className="text-xs font-semibold text-slate-600 uppercase">{label}</span>
            </div>
            <p className="text-2xl font-bold font-mono text-slate-800">{state?.current_version ?? '—'}</p>
            {state?.last_deployed_at
              ? <p className="text-xs text-slate-500 mt-1">Deployed {new Date(state.last_deployed_at).toLocaleDateString('nl-NL', { day:'2-digit', month:'short', year:'numeric' })}</p>
              : <p className="text-xs text-slate-400 mt-1">Not deployed yet</p>}
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-slate-700">
            Pending Commits
            {allPending.length > 0 && (
              <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">{allPending.length}</span>
            )}
          </h2>
          {someSelected && (
            <span className="text-xs text-blue-600 font-medium">
              {selectedIds.size} selected
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">Refresh</button>
          <button
            onClick={() => { setShowDeploy(true); setDeployLog(''); setDeployDone(false); }}
            disabled={!someSelected}
            title={someSelected ? `Deploy ${selectedIds.size} selected commit(s)` : 'Select at least one commit to deploy'}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all
              ${someSelected
                ? 'bg-red-600 hover:bg-red-700 cursor-pointer shadow-sm'
                : 'bg-slate-300 cursor-not-allowed text-slate-400'}`}>
            {someSelected
              ? `Deploy ${selectedIds.size} to Production`
              : 'Deploy to Production'}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 shadow-sm">
        <div className="relative">
          <BopSelect value={fRepo} onChange={v => setFRepo(v)} options={[{ value: String(''), label: `All repos` }, ...repos.map((r) => ({ value: String(r), label: `${r}` }))]} className="min-w-[130px]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
            <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        <input type="text" placeholder="Branch..." value={fBranch} onChange={e => setFBranch(e.target.value)}
          className="w-28 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-shadow hover:shadow" />
        <input type="text" placeholder="Author..." value={fAuthor} onChange={e => setFAuthor(e.target.value)}
          className="w-28 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-shadow hover:shadow" />
        <div className="relative">
          <BopSelect value={fRisk} onChange={v => setFRisk(v)} options={[{ value: String(''), label: `All risk` }, { value: String('3+'), label: `Risk &gt;= 3` }, { value: String('4+'), label: `Risk &gt;= 4 (High)` }, { value: String('mig'), label: `Has Migration` }]} className="min-w-[130px]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
            <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {(fBranch || fRepo || fAuthor || fRisk) && (
          <button onClick={() => { setFBranch(''); setFRepo(''); setFAuthor(''); setFRisk(''); }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-500 shadow-sm hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors">Clear</button>
        )}
        <span className="ml-auto text-xs text-slate-400">{pendingFiltered.length} of {allPending.length}</span>
      </div>

      {loading ? (
        <div className="text-sm text-slate-400">Loading...</div>
      ) : (
        <div className="space-y-8">

          {/* Pending table */}
          <div className="rounded-xl border border-orange-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between bg-orange-50 border-b border-orange-200 px-5 py-3">
              <h3 className="text-sm font-semibold text-orange-800">Pending Deployment</h3>
            </div>
            {pendingFiltered.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">
                {allPending.length === 0 ? 'No commits pending deployment' : 'No commits match filters'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {/* Checkbox column */}
                      <th className="w-10 px-3 py-3">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
                          title={allVisibleSelected ? 'Deselect all' : 'Select all visible'}
                        />
                      </th>
                      {([
                        ['hash','Hash'], ['repo','Repo'], ['branch','Branch'], ['author','Author'],
                        ['message_','Message'], ['risk_score','Risk'], ['has_migration','Mig'],
                        ['status','Status'], ['committed_at','Committed'], ['updated_at','Updated'], ['action_','Action']
                      ] as [string, string][]).map(([col, label]) =>
                        col.endsWith('_') ? (
                          <th key={col} className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</th>
                        ) : (
                          <th key={col} onClick={() => toggleSort(col as SortCol)}
                            className="group px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer select-none hover:text-slate-600 whitespace-nowrap">
                            {label}<SortIcon active={sortCol === col} dir={sortDir} />
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingFiltered.map((c: any) => {
                      const isSelected = selectedIds.has(c.id);
                      return (
                        <tr key={c.id}
                          onClick={() => toggleOne(c.id)}
                          className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-slate-50'}`}>
                          <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleOne(c.id)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-3 font-mono text-xs text-slate-600">{(c.hash ?? '').slice(0,7)}</td>
                          <td className="px-3 py-3">
                            {c.repo ? <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[11px] text-indigo-700">{c.repo}</span> : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-3 py-3">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">{c.branch}</span>
                          </td>
                          <td className="px-3 py-3 text-xs text-slate-600">{c.author}</td>
                          <td className="max-w-[160px] px-3 py-3 text-xs text-slate-700" title={c.message}>
                            <span className="block truncate">{c.message}</span>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`text-sm font-semibold ${(c.risk_score ?? 0) >= 4 ? 'text-red-600' : (c.risk_score ?? 0) >= 3 ? 'text-amber-600' : 'text-slate-400'}`}>
                              {c.risk_score ?? 0}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            {c.has_migration ? <span className="text-amber-500">✓</span> : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-3 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${COMMIT_STATUS_COLOR[c.status] ?? 'bg-slate-100 text-slate-500'}`}>
                              {c.status ?? 'committed'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">{c.committed_at ? fmt(c.committed_at) : '—'}</td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {c.updated_at
                              ? <span className="text-xs font-medium text-blue-600">{fmt(c.updated_at)}</span>
                              : <span className="text-xs text-slate-300">—</span>}
                          </td>
                          <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => { setUpdatingCommit(c.id); void markDeployed([c.id]).then(() => setUpdatingCommit(null)); }}
                              disabled={updatingCommit === c.id}
                              className="rounded px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 whitespace-nowrap">
                              {updatingCommit === c.id ? '...' : 'Mark Deployed'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recently deployed */}
          {deployedSorted.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-3">
                <h3 className="text-sm font-semibold text-slate-700">Recently Deployed</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {([['hash','Hash'],['repo','Repo'],['branch','Branch'],['author','Author'],['message_','Message'],['committed_at','Committed'],['updated_at','Updated']] as [string,string][]).map(([col, label]) =>
                        col.endsWith('_') ? (
                          <th key={col} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</th>
                        ) : (
                          <th key={col} onClick={() => toggleDSort(col as SortCol)}
                            className="group px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer select-none hover:text-slate-600 whitespace-nowrap">
                            {label}<SortIcon active={dSortCol === col} dir={dSortDir} />
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deployedSorted.map((c: any) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{(c.hash ?? '').slice(0,7)}</td>
                        <td className="px-4 py-3">
                          {c.repo ? <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[11px] text-indigo-700">{c.repo}</span> : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">{c.branch}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">{c.author}</td>
                        <td className="max-w-[200px] px-4 py-3 text-xs text-slate-700" title={c.message}>
                          <span className="block truncate">{c.message}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{c.committed_at ? fmt(c.committed_at) : '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {c.updated_at
                            ? <span className="text-xs font-medium text-blue-600">{fmt(c.updated_at)}</span>
                            : <span className="text-xs text-slate-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
