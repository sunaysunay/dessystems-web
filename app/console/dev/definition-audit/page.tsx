'use client';
// DV007 — Definition Audit: scans the code screen-registry against
// bop_objects / bop_documentation / bop_dependencies (populate-definition rule)
// and fixes gaps with one click (runs scripts/populate-all.cjs server-side).
import { useState, useEffect, useCallback } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { HelpPanel } from '@/components/HelpPanel';
import { BopSelect } from '@/components/BopSelect';
import { MODULE_NAMES } from '@/lib/module-labels';

export default function DefinitionAuditPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fixing, setFixing] = useState(false);
  const [log, setLog] = useState('');
  const [filter, setFilter] = useState<'gaps' | 'all'>('gaps');
  const [helpFor, setHelpFor] = useState<string | null>(null);
  // column filters
  const [fTc, setFTc] = useState('');
  const [fTitle, setFTitle] = useState('');
  const [fModule, setFModule] = useState('');
  const [fRoute, setFRoute] = useState('');
  const [fManual, setFManual] = useState('');   // '' | full | partial | draft | none
  const [fFlow, setFFlow] = useState('');       // '' | in | none
  const [fDeps, setFDeps] = useState('');       // '' | ok | missing
  const [fNav, setFNav] = useState('');         // '' | ok | missing | n/a

  const scan = useCallback(async () => {
    setLoading(true);
    const j = await fetch('/api/bop/dev/definition-audit').then(r => r.json());
    setData(j); setLoading(false);
  }, []);
  useEffect(() => { void scan(); }, [scan]);

  async function fixAll() {
    if (!confirm('Run the populate engine? It registers missing screens, wires dependencies from source, and generates ai-draft manuals. Idempotent — existing entries are never overwritten.')) return;
    setFixing(true); setLog('');
    const j = await fetch('/api/bop/dev/definition-audit', { method: 'POST' }).then(r => r.json());
    setLog(j.log ?? j.error ?? '');
    setFixing(false);
    void scan();
  }

  const card = (label: string, value: any, tone: string) => (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</div>
      <div className={`mt-1 text-[26px] font-bold ${tone}`}>{value}</div>
    </div>
  );

  const PHASES = ['overview', 'steps', 'faq', 'reference', 'process'] as const;
  const rows = (data?.rows ?? []).filter((r: any) => {
    if (filter === 'gaps' && r.registered && r.has_docs && r.has_deps && r.nav !== 'missing') return false;
    if (fTc && !r.id.toLowerCase().includes(fTc.toLowerCase())) return false;
    if (fTitle && !r.title.toLowerCase().includes(fTitle.toLowerCase())) return false;
    if (fModule && r.mod !== fModule) return false;
    if (fRoute && !r.route.toLowerCase().includes(fRoute.toLowerCase())) return false;
    if (fManual) {
      const ph = r.phases ?? {};
      const have = PHASES.filter(p => ph[p]);
      const anyDraft = PHASES.some(p => ph[p] === 'draft');
      const state = have.length === 0 ? 'none'
        : anyDraft ? 'draft'
        : have.length >= 4 ? 'full' : 'partial';
      if (fManual !== state) return false;
    }
    if (fFlow === 'in' && !(r.flows ?? []).length) return false;
    if (fFlow === 'none' && (r.flows ?? []).length) return false;
    if (fDeps === 'ok' && !r.has_deps) return false;
    if (fDeps === 'missing' && r.has_deps) return false;
    if (fNav && r.nav !== fNav) return false;
    return true;
  });
  const mods = [...new Set((data?.rows ?? []).map((r: any) => r.mod))].sort() as string[];
  const anyColFilter = fTc || fTitle || fModule || fRoute || fManual || fFlow || fDeps || fNav;

  const dot = (ok: boolean, warn = false) => (
    <span className={`inline-block h-2.5 w-2.5 rounded-full ${ok ? (warn ? 'bg-amber-400' : 'bg-emerald-500') : 'bg-red-500'}`} />
  );

  return (
    <div className="p-6">
      <ScreenHeader title="Definition Audit" description="Populate-definition completeness: screens, dependencies, manuals — scan the whole system for missing registrations" />

      <div className="mt-4 flex items-center gap-3">
        <button onClick={() => { void scan(); }} disabled={loading}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[12px] font-semibold text-slate-600 hover:border-orange-400 disabled:opacity-40 transition-colors">
          {loading ? 'Scanning…' : 'Re-scan'}
        </button>
        <button onClick={() => { void fixAll(); }} disabled={fixing || loading}
          className="rounded-lg bg-orange-500 px-4 py-2 text-[12px] font-semibold text-white hover:bg-orange-600 disabled:opacity-40 transition-colors">
          {fixing ? 'Fixing…' : 'Fix all missing'}
        </button>
        {data?.scanned_at && <span className="text-[11px] text-slate-400">scanned {new Date(data.scanned_at).toLocaleTimeString('nl-NL')}</span>}
      </div>

      {helpFor && <HelpPanel screenId={helpFor} open={true} onClose={() => setHelpFor(null)} />}

      {data && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-6">
            {card('Screens in registry', data.total, 'text-slate-800')}
            {card('Missing registration', data.missing_objects, data.missing_objects ? 'text-red-500' : 'text-emerald-600')}
            {card('Missing manuals', data.missing_docs, data.missing_docs ? 'text-red-500' : 'text-emerald-600')}
            {card('Missing dependencies', data.missing_deps, data.missing_deps ? 'text-amber-500' : 'text-emerald-600')}
            {card('Not in menu', data.missing_nav ?? 0, data.missing_nav ? 'text-red-500' : 'text-emerald-600')}
            {card('Draft manuals (ai)', data.draft_docs, 'text-amber-500')}
          </div>

          {data.phantom_apis?.length > 0 && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="text-[12px] font-bold text-red-600 mb-1">⚠ Phantom API calls — screens fetching endpoints that do not exist ({data.phantom_apis.length})</div>
              <div className="text-[11px] text-red-500 font-mono">
                {data.phantom_apis.map((p: any, i: number) => <div key={i}>{p.screen} → {p.api}</div>)}
              </div>
            </div>
          )}

          {log && (
            <pre className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-[11px] text-emerald-800 whitespace-pre-wrap">{log}</pre>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
              {(['gaps', 'all'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition-colors ${filter === f ? 'bg-orange-500 text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                  {f === 'gaps' ? `Gaps (${(data.rows ?? []).filter((r: any) => !r.registered || !r.has_docs || !r.has_deps).length})` : `All (${data.total})`}
                </button>
              ))}
            </div>
            <input value={fTc} onChange={e => setFTc(e.target.value)} placeholder="TC…"
              className="w-20 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-[11px] focus:outline-none focus:border-orange-400" />
            <input value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder="Title…"
              className="w-32 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] focus:outline-none focus:border-orange-400" />
            <BopSelect value={fModule} onChange={setFModule}
              options={[{ value: '', label: 'All modules' }, ...mods.map(m => ({ value: m, label: m, sublabel: MODULE_NAMES[m] }))]}
              className="min-w-[120px]" />
            <input value={fRoute} onChange={e => setFRoute(e.target.value)} placeholder="Route…"
              className="w-36 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-[11px] focus:outline-none focus:border-orange-400" />
            <BopSelect value={fManual} onChange={setFManual}
              options={[{ value: '', label: 'Manual: any' }, { value: 'full', label: 'full (4+ phases)' }, { value: 'partial', label: 'partial' }, { value: 'draft', label: 'has drafts' }, { value: 'none', label: 'none' }]}
              className="min-w-[130px]" />
            <BopSelect value={fFlow} onChange={setFFlow}
              options={[{ value: '', label: 'Flows: any' }, { value: 'in', label: 'in a flow' }, { value: 'none', label: 'no flow' }]}
              className="min-w-[110px]" />
            <BopSelect value={fDeps} onChange={setFDeps}
              options={[{ value: '', label: 'Deps: any' }, { value: 'ok', label: 'wired' }, { value: 'missing', label: 'missing' }]}
              className="min-w-[110px]" />
            <BopSelect value={fNav} onChange={setFNav}
              options={[{ value: '', label: 'Menu: any' }, { value: 'ok', label: 'in menu' }, { value: 'missing', label: '⚠ not in menu' }, { value: 'n/a', label: 'n/a (detail/hub)' }]}
              className="min-w-[130px]" />
            {anyColFilter && (
              <button onClick={() => { setFTc(''); setFTitle(''); setFModule(''); setFRoute(''); setFManual(''); setFFlow(''); setFDeps(''); setFNav(''); }}
                className="text-[11px] text-orange-600 hover:underline">Clear</button>
            )}
            <span className="text-[11px] text-slate-400">{rows.length} shown</span>
            <span className="flex items-center gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1">{dot(true)} authored</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" /> ai-draft</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-200" /> phase missing</span>
              <span className="flex items-center gap-1">{dot(false)} missing</span>
              <span>· Manual phases: <b>O</b>verview <b>S</b>teps <b>F</b>AQ <b>R</b>eference <b>P</b>rocess</span>
            </span>
          </div>

          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
                  {['TC', 'Title', 'Module', 'Registered', 'Manual phases (O·S·F·R·P)', 'Flows', 'Dependencies', 'Menu', 'Route'].map(h => (
                    <th key={h} className="px-3 py-2.5 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={8} className="px-3 py-10 text-center text-emerald-600 font-semibold">✓ No gaps — every screen is fully defined.</td></tr>
                ) : rows.map((r: any) => (
                  <tr key={r.id} onClick={() => setHelpFor(r.id)}
                    className="cursor-pointer border-b border-slate-50 transition-colors hover:bg-indigo-50/40"
                    title="Click to open this screen's manual">
                    <td className="px-3 py-2 font-mono font-semibold text-slate-700">{r.id}</td>
                    <td className="px-3 py-2 text-slate-800">
                      {r.title}
                      {r.brief && <div className="mt-0.5 max-w-[360px] truncate text-[10px] text-slate-400">{r.brief}</div>}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{r.mod}</td>
                    <td className="px-3 py-2">{dot(r.registered)}</td>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-1">
                        {(['overview', 'steps', 'faq', 'reference', 'process'] as const).map(ph => {
                          const st = r.phases?.[ph];
                          return (
                            <span key={ph} title={`${ph}: ${st ?? 'missing'}`}
                              className={`inline-block h-2.5 w-2.5 rounded-full ${st === 'system' ? 'bg-emerald-500' : st === 'draft' ? 'bg-amber-400' : 'bg-slate-200'}`} />
                          );
                        })}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {(r.flows ?? []).length
                        ? <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600" title={r.flows.join(', ')}>{r.flows.length} flow{r.flows.length > 1 ? 's' : ''}</span>
                        : <span className="text-[10px] text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2">{dot(r.has_deps)}</td>
                    <td className="px-3 py-2" title={r.nav === 'n/a' ? 'Detail screen / menu hub — no nav entry by design' : r.nav === 'missing' ? 'Not assigned in the left menu (bop_screens.nav_*)' : 'In the left menu'}>
                      {r.nav === 'n/a'
                        ? <span className="text-[10px] text-slate-300">n/a</span>
                        : r.nav === 'missing'
                          ? <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">⚠ no menu</span>
                          : dot(true)}
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-slate-400">{r.route}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
