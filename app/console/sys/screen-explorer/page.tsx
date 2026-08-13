'use client';
import { useState, useEffect, useRef } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { BopSelect } from '@/components/BopSelect';
import { useScope } from '@/lib/scope-context';

const STATUS_COLOR: Record<string,string> = {
  active: 'bg-emerald-100 text-emerald-700',
  v3:     'bg-slate-100 text-slate-400',
  legacy: 'bg-amber-100 text-amber-600',
};
const MOD_NAMES: Record<string, string> = {
  ANL:'Analytics', AST:'Asset / Inventory', AUC:'Auction', BOP:'Back-Office Platform',
  COM:'Communications', CRM:'Customer Relations', FIN:'Finance', INV:'Inventory Catalog',
  LOG:'Logistics', MDM:'Master Data', MKP:'Marketplace', MKT:'Marketing',
  OPS:'Operations', PRT:'Partner', PUB:'Publishing', SAL:'Sales',
  SYS:'System / Admin', WFL:'Workflow', WRK:'Workshop', AIM:'AI Management', DEV:'Development Lifecycle', INT:'Integrations',
};
const FUNC_LABEL: Record<string,string> = { LST:'List', DTL:'Detail', DSH:'Dashboard', CFG:'Config' };
const FUNC_OPTIONS  = ['LST','DTL','DSH','CFG'];
const STATUS_OPTIONS = ['active','v3','legacy'];
const MOD_OPTIONS   = ['SYS','MDM','AST','INV','CRM','SAL','MKP','FIN','ANL','OPS'];
const LIFECYCLE_OPTIONS = ['draft','dev','test','review','released','deprecated','archived'];
const LIFECYCLE_COLOR: Record<string,string> = {
  draft:      'bg-slate-100 text-slate-500',
  dev:        'bg-blue-100 text-blue-700',
  test:       'bg-amber-100 text-amber-700',
  review:     'bg-purple-100 text-purple-700',
  released:   'bg-emerald-100 text-emerald-700',
  deprecated: 'bg-orange-100 text-orange-600',
  archived:   'bg-red-100 text-red-500',
};
const METHOD_COLOR: Record<string,string> = {
  GET:'bg-emerald-100 text-emerald-700', POST:'bg-blue-100 text-blue-700',
  PATCH:'bg-amber-100 text-amber-700', DELETE:'bg-red-100 text-red-600', PUT:'bg-purple-100 text-purple-700',
};

type Tab = 'overview' | 'code' | 'registry' | 'usedby' | 'history';

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-0.5 font-mono text-xs font-medium text-slate-700 break-all">{value ?? '—'}</p>
    </div>
  );
}
function EditField({ label, name, value, onChange, type='text', options }: any) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</label>
      {options ? (
        <BopSelect value={value ?? ''} onChange={v => onChange({ target: { name, value: v } } as any)}
          options={options.map((o: string) => ({ value: o, label: o }))} placeholder={label} size="md" />
      ) : (
        <input name={name} value={value ?? ''} onChange={onChange} type={type}
          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-blue-400 focus:outline-none" />
      )}
    </div>
  );
}

// ── Dependency Graph ─────────────────────────────────────────────────────────
function DependencyGraph({ screen, usedBy, apiCalls, dbTables }: {
  screen: any;
  usedBy: { file: string; line: number }[];
  apiCalls: { method: string; url: string }[];
  dbTables: string[];
}) {
  const leftNodes  = usedBy.slice(0, 6).map((r, i) => ({ id: r.file.split('/').pop() ?? r.file, i }));
  const rightNodes = [
    ...apiCalls.slice(0, 4).map((a, i) => ({ id: `${a.method} ${a.url}`, type: 'api', i })),
    ...dbTables.slice(0, 3).map((t, i) => ({ id: t, type: 'db', i: i + apiCalls.slice(0,4).length })),
  ];
  const W = 560; const H = Math.max(180, Math.max(leftNodes.length, rightNodes.length) * 48 + 40);
  const cy = H / 2; const cx = W / 2;
  const leftX = 110; const rightX = W - 110;

  function yOf(i: number, total: number) {
    if (total <= 1) return cy;
    const span = Math.min(total * 44, H - 40);
    return cy - span / 2 + i * (span / (total - 1));
  }

  return (
    <div className="mx-4 mb-4 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-3 shadow-sm">
      <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">Dependency Graph</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 260 }}>
        {/* Edges left */}
        {leftNodes.map((n, i) => {
          const y = yOf(i, leftNodes.length);
          return <line key={i} x1={leftX + 10} y1={y} x2={cx - 32} y2={cy} stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="4 3" />;
        })}
        {/* Edges right */}
        {rightNodes.map((n, i) => {
          const y = yOf(i, rightNodes.length);
          return <line key={i} x1={cx + 32} y1={cy} x2={rightX - 10} y2={y} stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="4 3" />;
        })}
        {/* Center node */}
        <rect x={cx - 32} y={cy - 20} width={64} height={40} rx={10} fill="#3b82f6" />
        <text x={cx} y={cy - 5} textAnchor="middle" fill="white" fontSize={9} fontWeight="bold">{screen.screen_id}</text>
        <text x={cx} y={cy + 8} textAnchor="middle" fill="#bfdbfe" fontSize={7}>{screen.module}</text>
        {/* Left nodes — used by */}
        {leftNodes.map((n, i) => {
          const y = yOf(i, leftNodes.length);
          return (
            <g key={i}>
              <rect x={4} y={y - 14} width={leftX + 2} height={28} rx={7} fill="#f5f3ff" stroke="#e0e7ff" strokeWidth={1} />
              <text x={leftX / 2 + 4} y={y + 4} textAnchor="middle" fill="#7c3aed" fontSize={7} fontWeight="600">
                {n.id.replace('.tsx','').replace('.ts','').slice(0, 16)}
              </text>
            </g>
          );
        })}
        {/* Right nodes — api/db */}
        {rightNodes.map((n, i) => {
          const y = yOf(i, rightNodes.length);
          const isDb = n.type === 'db';
          return (
            <g key={i}>
              <rect x={rightX - 2} y={y - 14} width={W - rightX - 2} height={28} rx={7}
                fill={isDb ? '#fff7ed' : '#f0fdf4'} stroke={isDb ? '#fed7aa' : '#bbf7d0'} strokeWidth={1} />
              <text x={rightX + (W - rightX - 2) / 2 - 2} y={y + 4} textAnchor="middle"
                fill={isDb ? '#c2410c' : '#15803d'} fontSize={6.5} fontWeight="600">
                {n.id.slice(0, 20)}
              </text>
            </g>
          );
        })}
        {/* Labels */}
        {leftNodes.length > 0 && <text x={leftX / 2 + 4} y={12} textAnchor="middle" fill="#a78bfa" fontSize={7} fontWeight="bold">USED BY</text>}
        {rightNodes.length > 0 && <text x={rightX + (W - rightX - 2) / 2 - 2} y={12} textAnchor="middle" fill="#6b7280" fontSize={7} fontWeight="bold">CALLS</text>}
      </svg>
      {leftNodes.length === 0 && rightNodes.length === 0 && (
        <p className="text-center text-xs text-slate-400 py-4">No dependencies found</p>
      )}
    </div>
  );
}


export default function ScreenExplorerPage() {
  const { user } = useScope();
  const [screens, setScreens]     = useState<any[]>([]);
  const [bopModules, setBopModules] = useState<Record<string,{name:string;code:string}>>({});
  const [selected, setSelected]   = useState<any>(null);
  const [meta, setMeta]           = useState<any>(null);
  const [roles, setRoles]         = useState<any[]>([]);
  const [search, setSearch]       = useState('');
  const [modFilter, setModFilter] = useState('');
  const [modOpen, setModOpen]     = useState(false);
  const modRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState(false);
  const [draft, setDraft]         = useState<any>({});
  const [saving, setSaving]       = useState(false);
  const [saveMsg, setSaveMsg]     = useState('');
  const [tab, setTab]             = useState<Tab>('overview');
  const [treeView, setTreeView]   = useState(false);

  // Code tracer
  const [codeData, setCodeData]   = useState<any>(null);
  const [codeLoading, setCodeLoading] = useState(false);

  // Used By
  const [usedBy, setUsedBy]       = useState<any>(null);
  const [usedLoading, setUsedLoading] = useState(false);
  const [history, setHistory]           = useState<any[]>([]);
  const [histLoading, setHistLoading]   = useState(false);
  const [health, setHealth]             = useState<Record<string,'ok'|'warn'|'error'>>({});

  // Registry edit
  const [regEditing, setRegEditing]   = useState(false);
  const [regDraft, setRegDraft]       = useState<{ api_routes: any[]; db_tables: string[]; nav_group: string; notes: string }>({ api_routes: [], db_tables: [], nav_group: '', notes: '' });
  const [regSaving, setRegSaving]     = useState(false);
  const [regMsg, setRegMsg]           = useState('');

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (modRef.current && !modRef.current.contains(e.target as Node)) setModOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function loadScreens() {
    return fetch('/api/bop/sys/screens').then(r => r.json()).then(j => {
      setScreens(j.screens ?? []);
      setLoading(false);
    });
  }
  useEffect(() => {
    void loadScreens();
    void fetch('/api/bop/sys/health').then(r => r.json()).then(j => setHealth(j.health ?? {}));
    void fetch('/api/bop/sys/modules').then(r => r.json()).then(j => {
      const map: Record<string,{name:string;code:string}> = {};
      for (const m of (j.modules ?? [])) map[m.module_id] = { name: m.name, code: m.code };
      setBopModules(map);
    });
  }, []);

  async function selectScreen(s: any) {
    setSelected(s); setEditing(false); setSaveMsg(''); setMeta(null); setRoles([]);
    setCodeData(null); setUsedBy(null); setTab('overview'); setRegEditing(false); setRegMsg('');
    const [mj, rj] = await Promise.all([
      fetch(`/api/bop/sys/screens/${s.screen_id}/meta`).then(r => r.json()),
      fetch(`/api/bop/sys/screens/${s.screen_id}/roles`).then(r => r.json()),
    ]);
    setMeta(mj.meta);
    setRoles(rj.roles ?? []);
  }

  async function loadTab(t: Tab) {
    setTab(t);
    if (t === 'history' && selected) {
      setHistLoading(true);
      const j = await fetch(`/api/bop/sys/screens/${selected.screen_id}/history`).then(r => r.json());
      setHistory(j.history ?? []);
      setHistLoading(false);
    }
    if (t === 'code' && !codeData && selected) {
      setCodeLoading(true);
      const [cj, uj] = await Promise.all([
        fetch(`/api/bop/sys/screens/${selected.screen_id}/source`).then(r => r.json()),
        fetch(`/api/bop/sys/screens/${selected.screen_id}/used-by`).then(r => r.json()),
      ]);
      setCodeData(cj);
      setUsedBy(uj);
      setCodeLoading(false);
    }
    if (t === 'history' && selected) {
      setHistLoading(true);
      const j = await fetch(`/api/bop/sys/screens/${selected.screen_id}/history`).then(r => r.json());
      setHistory(j.history ?? []);
      setHistLoading(false);
    }
    if (t === 'usedby' && !usedBy && selected) {
      setUsedLoading(true);
      const j = await fetch(`/api/bop/sys/screens/${selected.screen_id}/used-by`).then(r => r.json());
      setUsedBy(j);
      setUsedLoading(false);
    }
  }

  function startEdit() { setDraft({ ...selected, lifecycle_state: selected.lifecycle_state ?? 'dev', owner: selected.owner ?? '' }); setEditing(true); setSaveMsg(''); }
  function onChange(e: React.ChangeEvent<any>) {
    const { name, value } = e.target;
    setDraft((d: any) => ({ ...d, [name]: name === 'sequence' ? Number(value) : value }));
  }
  async function saveEdit() {
    setSaving(true); setSaveMsg('');
    const res = await fetch(`/api/bop/sys/screens/${selected.screen_id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: draft.title, description: draft.description, module: draft.module, route: draft.route, func_type: draft.func_type, sequence: draft.sequence, status: draft.status, parent_id: draft.parent_id || null, lifecycle_state: draft.lifecycle_state, owner: draft.owner || null, changed_by: user?.email ?? 'admin' }),
    });
    const j = await res.json();
    if (res.ok) { setSaveMsg('Saved'); setEditing(false); setSelected(draft); setScreens(prev => prev.map(s => s.screen_id === draft.screen_id ? { ...s, ...draft } : s)); }
    else setSaveMsg('Error: ' + (j.error ?? 'unknown'));
    setSaving(false);
  }

  function startRegEdit() {
    setRegDraft({
      api_routes: meta?.api_routes ? JSON.parse(JSON.stringify(meta.api_routes)) : [],
      db_tables:  meta?.db_tables  ? [...meta.db_tables] : [],
      nav_group:  meta?.nav_group ?? '',
      notes:      meta?.notes ?? '',
    });
    setRegEditing(true); setRegMsg('');
  }
  async function saveReg() {
    setRegSaving(true); setRegMsg('');
    const res = await fetch(`/api/bop/sys/screens/${selected.screen_id}/meta`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regDraft),
    });
    const j = await res.json();
    if (res.ok) { setRegMsg('Saved'); setRegEditing(false); setMeta({ ...meta, ...regDraft }); }
    else setRegMsg('Error: ' + (j.error ?? 'unknown'));
    setRegSaving(false);
  }

  const modules  = [...new Set(screens.map(s => s.module))].sort();
  const filtered = screens.filter(s =>
    (modFilter === '' || s.module === modFilter) &&
    (search === '' || s.screen_id.toLowerCase().includes(search.toLowerCase()) ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.route.toLowerCase().includes(search.toLowerCase()))
  );

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'code',     label: 'Code Trace' },
    { id: 'registry', label: 'Object Registry' },
    { id: 'usedby',   label: 'Used By', badge: usedBy?.refs?.length },
    { id: 'history',  label: 'History', badge: history.length > 0 ? history.length : undefined },
  ];

  return (
    <div>
      <ScreenHeader title="Screen Explorer" description="Object catalog, code tracer and dependency viewer for all BOP screens" />

      <div className="flex h-[calc(100vh-11rem)] gap-4">

        {/* ── LEFT — screen list ── */}
        <div className="w-72 flex-shrink-0 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Screens ({filtered.length})</p>
            <button onClick={() => setTreeView(v => !v)} title={treeView ? 'Flat list' : 'Group by module'}
              className={`rounded-lg p-1.5 transition-colors ${treeView ? 'bg-blue-100 text-blue-600' : 'text-slate-300 hover:bg-slate-100 hover:text-slate-500'}`}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h10M4 14h6M4 18h4"/>
              </svg>
            </button>
          </div>
          <div className="border-b border-slate-100 p-2 space-y-2">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search ID, title, route…"
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:outline-none" autoComplete="off" />
            <div ref={modRef} className="relative">
              <button onClick={() => setModOpen(o => !o)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-medium transition-all ${modOpen ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
                <div className="flex items-center gap-2 min-w-0">
                  {modFilter
                    ? <div className="flex items-center gap-2">
                        <span className="rounded-md bg-blue-600 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">{modFilter}</span>
                        {bopModules[modFilter]?.code && <span className="rounded bg-slate-200 px-1 py-0.5 font-mono text-[9px] font-bold text-slate-500">{bopModules[modFilter].code}</span>}
                        <span className="text-slate-600 truncate">{bopModules[modFilter]?.name ?? MOD_NAMES[modFilter] ?? ''}</span>
                      </div>
                    : <span className="text-slate-500">All modules</span>}
                </div>
                <svg className={`h-3.5 w-3.5 text-slate-400 transition-transform ${modOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
              </button>
              {modOpen && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl ring-1 ring-black/5">
                  <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Filter by Module</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    <button onClick={() => { setModFilter(''); setModOpen(false); }}
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left ${!modFilter ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                      <span className={`h-6 w-6 flex-shrink-0 rounded-lg flex items-center justify-center text-[9px] font-bold ${!modFilter ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>ALL</span>
                      <span className={`text-xs font-semibold ${!modFilter ? 'text-blue-700' : 'text-slate-600'}`}>All modules</span>
                      {!modFilter && <svg className="ml-auto h-3.5 w-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                    </button>
                    {modules.map(m => {
                      const active = modFilter === m;
                      return (
                        <button key={m} onClick={() => { setModFilter(m); setModOpen(false); }}
                          className={`flex w-full items-center gap-2.5 px-3 py-2 text-left ${active ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                          <span className={`h-6 w-6 flex-shrink-0 rounded-lg flex items-center justify-center font-mono text-[9px] font-bold ${active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{m.slice(0,3)}</span>
                          <div className="min-w-0 flex-1">
                            <span className={`text-xs font-bold ${active ? 'text-blue-700' : 'text-slate-700'}`}>{m}</span>
                            {(bopModules[m]?.code || MOD_NAMES[m]) && (
                              <div className="ml-1.5 flex items-center gap-1.5">
                                {bopModules[m]?.code && <span className={`rounded px-1 py-0.5 font-mono text-[8px] font-bold ${active ? 'bg-blue-100 text-blue-500' : 'bg-slate-100 text-slate-400'}`}>{bopModules[m].code}</span>}
                                <span className={`text-xs ${active ? 'text-blue-500' : 'text-slate-400'}`}>{bopModules[m]?.name ?? MOD_NAMES[m]}</span>
                              </div>
                            )}
                          </div>
                          {active && <svg className="h-3.5 w-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                        </button>
                      );
                    })}
                  </div>
                  <div className="border-t border-slate-100 bg-slate-50/50 px-3 py-2">
                    <p className="text-[10px] text-slate-400">{modules.length} modules</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading && <p className="px-4 py-6 text-xs text-slate-400">Loading…</p>}
            {treeView ? (
              // ── Module tree view ──
              modules.filter(m => !modFilter || m === modFilter).map(m => {
                const group = filtered.filter(s => s.module === m);
                if (!group.length) return null;
                return (
                  <div key={m}>
                    <div className="sticky top-0 flex items-center gap-2 border-b border-slate-100 bg-slate-50/95 px-4 py-1.5 backdrop-blur-sm">
                      <span className="h-5 w-5 flex-shrink-0 rounded-md flex items-center justify-center bg-slate-200 font-mono text-[9px] font-bold text-slate-600">{m.slice(0,3)}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{bopModules[m]?.name ?? MOD_NAMES[m] ?? m}</span>
                      {bopModules[m]?.code && <span className="rounded bg-slate-700/60 px-1 py-0.5 font-mono text-[8px] font-bold text-slate-400">{bopModules[m].code}</span>}
                      <span className="ml-auto text-[9px] text-slate-400">{group.length}</span>
                    </div>
                    {group.map(s => (
                      <div key={s.screen_id} onClick={() => { void selectScreen(s); }}
                        className={`cursor-pointer border-b border-slate-50 px-4 py-2 transition-colors ${selected?.screen_id === s.screen_id ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-slate-50'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 flex-shrink-0 rounded-full ${health[s.screen_id] === 'ok' ? 'bg-emerald-400' : health[s.screen_id] === 'error' ? 'bg-red-400' : 'bg-amber-400'}`} />
                            <span className="font-mono text-xs font-bold text-blue-500">{s.screen_id}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {s.lifecycle_state && s.lifecycle_state !== 'released' && (
                              <span className={`rounded px-1 py-0.5 text-[8px] font-bold ${LIFECYCLE_COLOR[s.lifecycle_state] ?? ''}`}>{s.lifecycle_state}</span>
                            )}
                            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${STATUS_COLOR[s.status] ?? STATUS_COLOR.legacy}`}>{s.status}</span>
                          </div>
                        </div>
                        <p className="text-xs font-medium text-slate-700">{s.title}</p>
                      </div>
                    ))}
                  </div>
                );
              })
            ) : (
              // ── Flat list ──
              filtered.map(s => (
                <div key={s.screen_id} onClick={() => { void selectScreen(s); }}
                  className={`cursor-pointer border-b border-slate-50 px-4 py-2.5 transition-colors ${selected?.screen_id === s.screen_id ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-slate-50'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 flex-shrink-0 rounded-full ${health[s.screen_id] === 'ok' ? 'bg-emerald-400' : health[s.screen_id] === 'error' ? 'bg-red-400' : 'bg-amber-400'}`} title={health[s.screen_id] ?? 'warn'} />
                      <span className="font-mono text-xs font-bold text-blue-500">{s.screen_id}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {s.lifecycle_state && s.lifecycle_state !== 'released' && (
                        <span className={`rounded px-1 py-0.5 text-[8px] font-bold ${LIFECYCLE_COLOR[s.lifecycle_state] ?? ''}`}>{s.lifecycle_state}</span>
                      )}
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${STATUS_COLOR[s.status] ?? STATUS_COLOR.legacy}`}>{s.status}</span>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-slate-700 mt-0.5">{s.title}</p>
                  <p className="text-[10px] text-slate-400 truncate">{s.route}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── RIGHT — tabbed detail ── */}
        <div className="flex-1 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
          {!selected ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
              <svg className="h-10 w-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
              <p className="text-sm">Select a screen to inspect</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="border-b border-slate-100 px-6 pt-5 pb-0">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-lg font-bold text-blue-600">{selected.screen_id}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLOR[selected.status] ?? STATUS_COLOR.legacy}`}>{selected.status}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{FUNC_LABEL[selected.func_type] ?? selected.func_type}</span>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-500">{selected.module}</span>
                    {bopModules[selected.module]?.code && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500" title={bopModules[selected.module]?.name}>
                        {bopModules[selected.module].code}
                      </span>
                    )}
                    {bopModules[selected.module]?.name && (
                      <span className="text-[10px] text-slate-400">{bopModules[selected.module].name}</span>
                    )}
                    {selected.lifecycle_state && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${LIFECYCLE_COLOR[selected.lifecycle_state] ?? 'bg-slate-100 text-slate-500'}`}>
                        {selected.lifecycle_state}
                      </span>
                    )}
                    {selected.owner && (
                      <span className="flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-600">
                        <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/></svg>
                        {selected.owner}
                      </span>
                    )}
                    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${health[selected.screen_id] === 'ok' ? 'bg-emerald-50 text-emerald-600' : health[selected.screen_id] === 'error' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${health[selected.screen_id] === 'ok' ? 'bg-emerald-500' : health[selected.screen_id] === 'error' ? 'bg-red-500' : 'bg-amber-500'}`} />
                      {health[selected.screen_id] === 'ok' ? 'healthy' : health[selected.screen_id] === 'error' ? 'error' : 'dev'}
                    </span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">{selected.title}</h2>
                    {selected.description && <p className="text-sm text-slate-400 mt-0.5">{selected.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {saveMsg === 'Saved' && <span className="text-xs font-medium text-emerald-600">✓ Saved</span>}
                    {!editing && <button onClick={startEdit} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100">Edit Screen</button>}
                    <a href={selected.route} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50">Open →</a>
                  </div>
                </div>
                {/* Tabs */}
                {!editing && (
                  <div className="flex gap-0">
                    {TABS.map(t => (
                      <button key={t.id} onClick={() => { void loadTab(t.id); }}
                        className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-xs font-semibold transition-colors ${tab === t.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                        {t.label}
                        {t.badge !== undefined && t.badge > 0 && (
                          <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-600">{t.badge}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-6">

                {/* ── EDIT MODE ── */}
                {editing && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-400">Editing <span className="font-mono font-semibold">{selected.screen_id}</span></p>
                      <div className="flex items-center gap-2">
                        {saveMsg && <span className={`text-xs font-medium ${saveMsg === 'Saved' ? 'text-emerald-600' : 'text-red-500'}`}>{saveMsg}</span>}
                        <button onClick={() => setEditing(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50">Cancel</button>
                        <button onClick={() => { void saveEdit(); }} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save Changes'}</button>
                      </div>
                    </div>
                    <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-5 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <EditField label="Title" name="title" value={draft.title} onChange={onChange} />
                        <EditField label="Module" name="module" value={draft.module} onChange={onChange} options={MOD_OPTIONS} />
                        <EditField label="Route" name="route" value={draft.route} onChange={onChange} />
                        <EditField label="Function Type" name="func_type" value={draft.func_type} onChange={onChange} options={FUNC_OPTIONS} />
                        <EditField label="Sequence" name="sequence" value={draft.sequence} onChange={onChange} type="number" />
                        <EditField label="Status" name="status" value={draft.status} onChange={onChange} options={STATUS_OPTIONS} />
                        <EditField label="Parent Screen ID" name="parent_id" value={draft.parent_id} onChange={onChange} />
                        <EditField label="Lifecycle State" name="lifecycle_state" value={draft.lifecycle_state ?? 'dev'} onChange={onChange} options={LIFECYCLE_OPTIONS} />
                        <EditField label="Owner" name="owner" value={draft.owner ?? ''} onChange={onChange} placeholder="e.g. Finance Team" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Description</label>
                        <textarea name="description" value={draft.description ?? ''} onChange={onChange} rows={3}
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-blue-400 focus:outline-none resize-none" />
                      </div>
                    </div>
                    <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-1">Note</p>
                      <p className="text-xs text-slate-500">TC code <span className="font-mono font-semibold">{selected.screen_id}</span> is the primary key — change it via Supabase console only.</p>
                    </div>
                  </div>
                )}

                {/* ── TAB: OVERVIEW ── */}
                {!editing && tab === 'overview' && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-3 gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <Field label="Module" value={`${selected.module}${bopModules[selected.module]?.code ? ' · ' + bopModules[selected.module].code : ''} — ${bopModules[selected.module]?.name ?? MOD_NAMES[selected.module] ?? ''}`} />
                      <Field label="Route" value={selected.route} />
                      <Field label="Function Type" value={FUNC_LABEL[selected.func_type] ?? selected.func_type} />
                      <Field label="Sequence" value={selected.sequence} />
                      <Field label="Status" value={selected.status} />
                      <Field label="Parent" value={selected.parent_id ?? '—'} />
                    </div>

                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">API Endpoints</p>
                      {(meta?.api_routes ?? []).length === 0
                        ? <p className="text-xs text-slate-300 italic">Not registered — go to Object Registry tab to add</p>
                        : <div className="space-y-1">{(meta?.api_routes ?? []).map((r: any, i: number) => (
                            <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2">
                              <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${METHOD_COLOR[r.method] ?? 'bg-slate-100 text-slate-500'}`}>{r.method}</span>
                              <span className="font-mono text-xs text-slate-600">{r.path}</span>
                              {r.description && <span className="text-xs text-slate-400 ml-auto">{r.description}</span>}
                            </div>
                          ))}</div>}
                    </div>

                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Database Tables</p>
                      {(meta?.db_tables ?? []).length === 0
                        ? <p className="text-xs text-slate-300 italic">Not registered — go to Object Registry tab to add</p>
                        : <div className="flex flex-wrap gap-2">{(meta?.db_tables ?? []).map((t: string) => (
                            <span key={t} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-xs text-slate-600">{t}</span>
                          ))}</div>}
                    </div>

                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Roles with Access</p>
                      {roles.length === 0
                        ? <p className="text-xs text-slate-300">No roles assigned yet</p>
                        : <div className="space-y-1">{roles.map((r: any) => (
                            <div key={r.role_id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2">
                              <span className="text-sm font-medium text-slate-700">{r.role_name}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.access_level==='admin'?'bg-red-100 text-red-600':r.access_level==='approve'?'bg-amber-100 text-amber-700':r.access_level==='edit'?'bg-blue-100 text-blue-700':'bg-slate-100 text-slate-500'}`}>{r.access_level}</span>
                            </div>
                          ))}</div>}
                    </div>

                    {selected?.nav_group && (() => {
                      const GL: Record<string,string> = {
                        overview:'Overview', operations:'Operations', salesCrm:'Sales & CRM',
                        marketplace:'Marketplace', sales:'Sales', finance:'Finance',
                        intelligence:'Intelligence', masterData:'Master Data', tools:'Tools', system:'System',
                      };
                      const SL: Record<string,string> = {
                        development:'Development', integration:'Integration', users:'Users',
                        accessRoles:'Access Roles', configuration:'Configuration',
                        infrastructure:'Infrastructure', dataAcquisition:'Data Acquisition',
                      };
                      const g = GL[selected.nav_group] ?? selected.nav_group;
                      const sg = selected.nav_subgroup ? SL[selected.nav_subgroup] ?? selected.nav_subgroup : null;
                      const navPath = sg ? `${g} → ${sg} → ${selected.title}` : `${g} → ${selected.title}`;
                      return (
                        <div>
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Navigation</p>
                          <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs">
                            <p className="font-semibold text-indigo-700 mb-1">{navPath}</p>
                            <div className="flex flex-wrap gap-2 mt-1 text-[10px] text-slate-500">
                              <span>Group: <span className="font-mono">{selected.nav_group}</span></span>
                              {selected.nav_subgroup && <span>Subgroup: <span className="font-mono">{selected.nav_subgroup}</span></span>}
                              <span>Order: <span className="font-mono">{selected.nav_order ?? '—'}</span></span>
                              <span className={selected.nav_visible ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>{selected.nav_visible ? '✓ Visible in nav' : '○ Hidden from nav'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    {meta?.notes && (
                      <div>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Notes</p>
                        <p className="text-xs text-slate-500">{meta.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── TAB: CODE TRACE ── */}
                {!editing && tab === 'code' && (
                  <div className="space-y-5">
                    {codeLoading && <p className="text-xs text-slate-400">Tracing source file…</p>}
                    {codeData && !codeData.found && (
                      <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                        <p className="text-sm font-semibold text-amber-700">Source file not found</p>
                        <p className="text-xs text-slate-500 mt-1">Route <span className="font-mono">{codeData.route}</span> has no matching <span className="font-mono">page.tsx</span> in the app directory.</p>
                      </div>
                    )}
                    {codeData?.found && (
                      <>
                        {/* File info */}
                        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                          <svg className="h-5 w-5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-xs font-semibold text-slate-700 truncate">{codeData.file}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{codeData.lineCount} lines · {(codeData.size / 1024).toFixed(1)} KB · modified {new Date(codeData.modified).toLocaleString('en-GB')}</p>
                          </div>
                        </div>

                        {/* Impact Summary */}
                        {usedBy && (
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { label: 'Referenced by', value: usedBy.refs?.length ?? 0, color: 'blue' },
                              { label: 'API calls', value: codeData.apiCalls?.length ?? 0, color: 'emerald' },
                              { label: 'Components', value: codeData.components?.length ?? 0, color: 'purple' },
                            ].map(({ label, value, color }) => (
                              <div key={label} className={`rounded-xl border border-${color}-100 bg-${color}-50/50 px-4 py-3 text-center`}>
                                <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
                                <p className={`text-[10px] font-semibold text-${color}-400 mt-0.5`}>{label}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Components */}
                        {codeData.components?.length > 0 && (
                          <div>
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">React Components Used ({codeData.components.length})</p>
                            <div className="flex flex-wrap gap-2">
                              {codeData.components.map((c: string) => (
                                <span key={c} className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1 font-mono text-xs font-semibold text-blue-700">{c}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* API calls */}
                        {codeData.apiCalls?.length > 0 && (
                          <div>
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">API Calls ({codeData.apiCalls.length})</p>
                            <div className="space-y-1">
                              {codeData.apiCalls.map((a: any, i: number) => (
                                <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2">
                                  <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${METHOD_COLOR[a.method] ?? 'bg-slate-100 text-slate-500'}`}>{a.method}</span>
                                  <span className="font-mono text-xs text-slate-600">{a.url}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* State vars */}
                        {codeData.stateVars?.length > 0 && (
                          <div>
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">State Variables ({codeData.stateVars.length})</p>
                            <div className="rounded-xl border border-slate-100 overflow-hidden">
                              <table className="w-full text-xs">
                                <thead><tr className="bg-slate-50 border-b border-slate-100"><th className="px-3 py-2 text-left font-bold text-slate-400">Name</th><th className="px-3 py-2 text-left font-bold text-slate-400">Type</th><th className="px-3 py-2 text-left font-bold text-slate-400">Initial</th></tr></thead>
                                <tbody>{codeData.stateVars.map((v: any, i: number) => (
                                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                                    <td className="px-3 py-2 font-mono font-semibold text-blue-600">{v.name}</td>
                                    <td className="px-3 py-2 font-mono text-slate-400">{v.type || '—'}</td>
                                    <td className="px-3 py-2 font-mono text-slate-500">{v.init || '—'}</td>
                                  </tr>
                                ))}</tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Functions */}
                        {codeData.functions?.length > 0 && (
                          <div>
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Functions ({codeData.functions.length})</p>
                            <div className="flex flex-wrap gap-2">
                              {codeData.functions.map((f: string) => (
                                <span key={f} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-xs text-slate-600">{f}()</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* External libs */}
                        {codeData.externalLibs?.length > 0 && (
                          <div>
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">External Libraries</p>
                            <div className="flex flex-wrap gap-2">
                              {codeData.externalLibs.map((l: string) => (
                                <span key={l} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-xs text-slate-500">{l}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* ── TAB: OBJECT REGISTRY ── */}
                {!editing && tab === 'registry' && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500">Manage the technical metadata stored in <span className="font-mono">bop_screen_meta</span> for this screen.</p>
                      <div className="flex items-center gap-2">
                        {regMsg && <span className={`text-xs font-medium ${regMsg === 'Saved' ? 'text-emerald-600' : 'text-red-500'}`}>{regMsg}</span>}
                        {regEditing
                          ? <><button onClick={() => setRegEditing(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50">Cancel</button>
                              <button onClick={() => { void saveReg(); }} disabled={regSaving} className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{regSaving ? 'Saving…' : 'Save Registry'}</button></>
                          : <button onClick={startRegEdit} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100">Edit Registry</button>
                        }
                      </div>
                    </div>

                    {/* API Routes */}
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">API Routes</p>
                      {regEditing ? (
                        <div className="space-y-2">
                          {regDraft.api_routes.map((r: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                              <BopSelect value={r.method} onChange={v => { const d = [...regDraft.api_routes]; d[i] = {...d[i], method: v}; setRegDraft(p => ({...p, api_routes: d})); }} options={[...['GET','POST','PATCH','PUT','DELETE'].map((m) => ({ value: String(`${m}`), label: `${m}` }))]} className="min-w-[130px]" />
                              <input value={r.path} onChange={e => { const d = [...regDraft.api_routes]; d[i] = {...d[i], path: e.target.value}; setRegDraft(p => ({...p, api_routes: d})); }}
                                placeholder="/api/bop/…" className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 font-mono text-xs focus:outline-none" />
                              <input value={r.description ?? ''} onChange={e => { const d = [...regDraft.api_routes]; d[i] = {...d[i], description: e.target.value}; setRegDraft(p => ({...p, api_routes: d})); }}
                                placeholder="Description…" className="w-40 rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none" />
                              <button onClick={() => setRegDraft(p => ({...p, api_routes: p.api_routes.filter((_,j) => j !== i)}))} className="text-red-400 hover:text-red-600 px-1">✕</button>
                            </div>
                          ))}
                          <button onClick={() => setRegDraft(p => ({...p, api_routes: [...p.api_routes, {method:'GET', path:'', description:''}]}))}
                            className="rounded-lg border border-dashed border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-500 hover:bg-blue-50 w-full text-center">
                            + Add API Route
                          </button>
                        </div>
                      ) : (
                        (meta?.api_routes ?? []).length === 0
                          ? <p className="text-xs text-slate-300 italic">None registered</p>
                          : <div className="space-y-1">{(meta?.api_routes ?? []).map((r: any, i: number) => (
                              <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2">
                                <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${METHOD_COLOR[r.method] ?? 'bg-slate-100 text-slate-500'}`}>{r.method}</span>
                                <span className="font-mono text-xs text-slate-600">{r.path}</span>
                                {r.description && <span className="text-xs text-slate-400 ml-auto">{r.description}</span>}
                              </div>
                            ))}</div>
                      )}
                    </div>

                    {/* DB Tables */}
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Database Tables</p>
                      {regEditing ? (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {regDraft.db_tables.map((t: string, i: number) => (
                              <span key={i} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-600">
                                {t}
                                <button onClick={() => setRegDraft(p => ({...p, db_tables: p.db_tables.filter((_,j) => j !== i)}))} className="text-red-400 hover:text-red-600 ml-1">✕</button>
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input id="new-table" placeholder="table_name" className="rounded-lg border border-slate-200 px-3 py-1.5 font-mono text-xs focus:outline-none" />
                            <button onClick={() => {
                              const inp = document.getElementById('new-table') as HTMLInputElement;
                              if (inp?.value.trim()) { setRegDraft(p => ({...p, db_tables: [...p.db_tables, inp.value.trim()]})); inp.value = ''; }
                            }} className="rounded-lg border border-dashed border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-500 hover:bg-blue-50">+ Add</button>
                          </div>
                        </div>
                      ) : (
                        (meta?.db_tables ?? []).length === 0
                          ? <p className="text-xs text-slate-300 italic">None registered</p>
                          : <div className="flex flex-wrap gap-2">{(meta?.db_tables ?? []).map((t: string) => (
                              <span key={t} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-xs text-slate-600">{t}</span>
                            ))}</div>
                      )}
                    </div>

                    {/* Nav group + notes */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Nav Group</p>
                        {regEditing
                          ? <input value={regDraft.nav_group} onChange={e => setRegDraft(p => ({...p, nav_group: e.target.value}))} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none" />
                          : <p className="text-xs text-slate-600">{meta?.nav_group || '—'}</p>}
                      </div>
                      <div>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Notes</p>
                        {regEditing
                          ? <textarea value={regDraft.notes} onChange={e => setRegDraft(p => ({...p, notes: e.target.value}))} rows={2} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none resize-none" />
                          : <p className="text-xs text-slate-600">{meta?.notes || '—'}</p>}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── TAB: HISTORY ── */}
                {!editing && tab === 'history' && (
                  <div className="space-y-2 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Change Log — {selected.screen_id}</p>
                    {histLoading && <p className="text-xs text-slate-400">Loading…</p>}
                    {!histLoading && history.length === 0 && (
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-8 text-center">
                        <p className="text-sm text-slate-400">No changes recorded yet.</p>
                        <p className="text-xs text-slate-300 mt-1">Changes are logged when fields are edited and saved.</p>
                      </div>
                    )}
                    {history.map((h: any, i: number) => (
                      <div key={i} className="flex gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                        <div className="flex w-5 flex-col items-center pt-1">
                          <span className={`h-2 w-2 flex-shrink-0 rounded-full ${h.source === 'meta' ? 'bg-purple-400' : 'bg-blue-400'}`} />
                          {i < history.length - 1 && <div className="mt-1 flex-1 w-px bg-slate-100" />}
                        </div>
                        <div className="min-w-0 flex-1 pb-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">{h.field}</span>
                            <span className="flex-shrink-0 text-[10px] text-slate-400">{new Date(h.changed_at).toLocaleString('nl-NL', { dateStyle: 'short', timeStyle: 'short' })}</span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                            <span className="max-w-[40%] truncate rounded bg-red-50 px-1.5 py-0.5 font-mono text-red-500">{h.old_val ?? '—'}</span>
                            <svg className="h-3 w-3 flex-shrink-0 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                            <span className="max-w-[40%] truncate rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-emerald-600">{h.new_val ?? '—'}</span>
                          </div>
                          <p className="mt-1 text-[10px] text-slate-400">by <span className="font-semibold text-slate-500">{h.changed_by}</span></p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── TAB: USED BY ── */}
                {!editing && tab === 'usedby' && (
                  <div className="space-y-4">
                    {usedLoading && <p className="text-xs text-slate-400">Scanning source files…</p>}
                    {usedBy && (
                      <>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-slate-500">References to route <span className="font-mono font-semibold text-blue-600">{usedBy.route}</span> or TC <span className="font-mono font-semibold text-blue-600">{selected.screen_id}</span> found in {usedBy.refs?.length ?? 0} location(s)</p>
                          <button onClick={() => { setUsedBy(null); void loadTab('usedby'); }} className="ml-auto rounded-lg border border-slate-200 px-2 py-1 text-[10px] text-slate-400 hover:bg-slate-50">↻ Rescan</button>
                        </div>
                        {codeData && (
                          <DependencyGraph
                            screen={selected}
                            usedBy={usedBy.refs ?? []}
                            apiCalls={codeData.apiCalls ?? []}
                            dbTables={meta?.db_tables ?? []}
                          />
                        )}
                        {usedBy.refs?.length === 0 ? (
                          <div className="rounded-xl border border-slate-100 bg-slate-50 p-8 text-center">
                            <p className="text-sm text-slate-400">No references found in the codebase</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {usedBy.refs.map((r: any, i: number) => (
                              <div key={i} className="rounded-lg border border-slate-100 bg-white px-4 py-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-mono text-[10px] font-bold text-blue-500">{r.file}</span>
                                  <span className="text-[10px] text-slate-400">line {r.line}</span>
                                </div>
                                <p className="font-mono text-xs text-slate-600 bg-slate-50 rounded px-2 py-1 truncate">{r.context}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
