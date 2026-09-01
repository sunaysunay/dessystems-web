'use client';
// SY035 — Flow Map: interactive diagram of business flows → screens → APIs →
// tables (React Flow + dagre auto-layout). Click a screen node to open its
// manual; expand a screen to reveal its API/table dependencies.
import { useState, useEffect, useMemo, useCallback } from 'react';
import { ReactFlow, Background, Controls, MiniMap, type Node, type Edge, Position, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import { ScreenHeader } from '@/components/ScreenBadge';
import { HelpPanel } from '@/components/HelpPanel';
import { BopSelect } from '@/components/BopSelect';
import { MODULE_NAMES } from '@/lib/module-labels';

const NODE_W = 190, NODE_H = 48;

function layout(nodes: Node[], edges: Edge[], dir: 'LR' | 'TB' = 'LR') {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: dir, nodesep: 24, ranksep: 90 });
  nodes.forEach(n => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map(n => {
    const p = g.node(n.id);
    return { ...n, position: { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 }, sourcePosition: Position.Right, targetPosition: Position.Left };
  });
}

const nodeStyle = (kind: string, dim = false): React.CSSProperties => ({
  width: NODE_W, padding: '8px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600,
  opacity: dim ? 0.35 : 1, cursor: 'pointer',
  ...(kind === 'process' ? { background: '#eef2ff', border: '2px solid #6366f1', color: '#3730a3' }
    : kind === 'screen' ? { background: '#fff', border: '1.5px solid #cbd5e1', color: '#1e293b' }
    : kind === 'api' ? { background: '#eff6ff', border: '1.5px solid #93c5fd', color: '#1d4ed8', fontSize: 10 }
    : { background: '#f0fdf4', border: '1.5px solid #86efac', color: '#166534', fontSize: 10 }),
});

const edgeStyle = (dep: string) =>
  dep === 'involves' ? { stroke: '#6366f1', strokeWidth: 2 }
  : dep === 'calls' ? { stroke: '#3b82f6', strokeWidth: 1.5 }
  : dep === 'writes' ? { stroke: '#f59e0b', strokeWidth: 1.5 }
  : { stroke: '#22c55e', strokeWidth: 1.2 };

export default function FlowMapPage() {
  const [data, setData] = useState<any>(null);
  const [flow, setFlow] = useState('');            // '' = system view (all flows)
  const [expanded, setExpanded] = useState<Set<string>>(new Set()); // screen ids with deps shown
  const [helpFor, setHelpFor] = useState<string | null>(null);
  // filters: non-matching screens are dimmed (context preserved)
  const [fModule, setFModule] = useState('');
  const [fTc, setFTc] = useState('');
  const [fTitle, setFTitle] = useState('');
  // compare mode: pick 2-3 nodes (screens or flows) → shared vs unique panel
  const [compare, setCompare] = useState(false);
  const [picked, setPicked] = useState<string[]>([]); // 's:SA013' | 'p:slug'
  // table detail modal (clicking a 🗄 table node)
  const [tableInfo, setTableInfo] = useState<{ name: string; loading: boolean; tech?: any } | null>(null);

  const openTable = useCallback(async (name: string) => {
    setTableInfo({ name, loading: true });
    const tech = await fetch(`/api/bop/sys/explorer?action=tech&table=${encodeURIComponent(name)}`)
      .then(r => r.json()).catch(() => null);
    setTableInfo({ name, loading: false, tech });
  }, []);

  useEffect(() => {
    void fetch('/api/bop/sys/flow-map').then(r => r.json()).then(setData);
  }, []);

  const { nodes, edges } = useMemo(() => {
    if (!data) return { nodes: [], edges: [] };
    const N: Node[] = [], E: Edge[] = [];
    const allFlows = flow ? data.processes.filter((p: any) => p.slug === flow) : data.processes;
    const flows = fModule ? allFlows.filter((p: any) => p.module === fModule) : allFlows;
    const flowSet = new Set(flows.map((f: any) => f.slug));
    const screenIds = new Set<string>();

    for (const p of flows) {
      const isPicked = picked.includes('p:' + p.slug);
      N.push({
        id: 'p:' + p.slug, data: { label: p.name }, position: { x: 0, y: 0 },
        style: { ...nodeStyle('process'), ...(isPicked ? { border: '2.5px solid #f97316', boxShadow: '0 0 0 3px rgba(249,115,22,0.15)' } : {}) },
      });
    }
    for (const e of data.involves) {
      if (!flowSet.has(e.flow)) continue;
      screenIds.add(e.screen);
      E.push({
        id: `inv-${e.flow}-${e.screen}`, source: 'p:' + e.flow, target: 's:' + e.screen,
        style: edgeStyle('involves'), markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' }, animated: false,
      });
    }
    const matches = (sid: string, s: any) => {
      if (fModule && s?.module !== fModule) return false;
      if (fTc && !sid.toLowerCase().includes(fTc.toLowerCase())) return false;
      if (fTitle && !(s?.title ?? '').toLowerCase().includes(fTitle.toLowerCase())) return false;
      return true;
    };
    for (const sid of screenIds) {
      const s = data.screens.find((x: any) => x.screen_id === sid);
      const dim = Boolean((fModule || fTc || fTitle) && !matches(sid, s));
      const isPicked = picked.includes('s:' + sid);
      N.push({
        id: 's:' + sid,
        data: { label: `${sid} · ${s?.title ?? sid}${expanded.has(sid) ? ' ▾' : ''}` },
        position: { x: 0, y: 0 },
        style: {
          ...nodeStyle('screen', dim),
          ...(isPicked ? { border: '2.5px solid #f97316', boxShadow: '0 0 0 3px rgba(249,115,22,0.15)' } : {}),
        },
      });
      if (expanded.has(sid)) {
        const deps = data.screenDeps.filter((d: any) => d.screen === sid);
        for (const d of deps.slice(0, 12)) {
          const nid = d.target;
          if (!N.find(n => n.id === nid)) {
            N.push({ id: nid, data: { label: (d.kind === 'api' ? '⚡ ' : '🗄 ') + String(d.label).slice(0, 34) }, position: { x: 0, y: 0 }, style: nodeStyle(d.kind) });
          }
          E.push({ id: `d-${sid}-${nid}`, source: 's:' + sid, target: nid, style: edgeStyle(d.dep), markerEnd: { type: MarkerType.ArrowClosed } });
          // api → table second hop
          if (d.kind === 'api') {
            for (const ad of data.apiDeps.filter((x: any) => x.api === nid).slice(0, 6)) {
              if (!N.find(n => n.id === ad.target)) {
                N.push({ id: ad.target, data: { label: '🗄 ' + ad.label }, position: { x: 0, y: 0 }, style: nodeStyle('table') });
              }
              E.push({ id: `a-${nid}-${ad.target}`, source: nid, target: ad.target, style: edgeStyle(ad.dep), markerEnd: { type: MarkerType.ArrowClosed } });
            }
          }
        }
      }
    }
    return { nodes: layout(N, E), edges: E };
  }, [data, flow, expanded, fModule, fTc, fTitle, picked]);

  const onNodeClick = useCallback((_e: any, node: Node) => {
    if (compare) {
      if (node.id.startsWith('s:') || node.id.startsWith('p:')) {
        setPicked(prev => prev.includes(node.id)
          ? prev.filter(x => x !== node.id)
          : prev.length >= 3 ? prev : [...prev, node.id]);
      }
      return;
    }
    if (node.id.startsWith('s:')) {
      const sid = node.id.slice(2);
      setExpanded(prev => {
        const next = new Set(prev);
        next.has(sid) ? next.delete(sid) : next.add(sid);
        return next;
      });
    }
    if (node.id.startsWith('table:')) void openTable(node.id.replace('table:', ''));
  }, [compare, openTable]);

  // ── comparison: footprint per picked object (screens+APIs+tables) ──────────
  const comparison = useMemo(() => {
    if (!data || picked.length < 2) return null;
    const foot = (id: string) => {
      const apis = new Set<string>(), tables = new Set<string>(), scrs = new Set<string>();
      const addScreenDeps = (sid: string) => {
        for (const d of data.screenDeps.filter((x: any) => x.screen === sid)) {
          (d.kind === 'api' ? apis : tables).add(String(d.label));
          if (d.kind === 'api') for (const ad of data.apiDeps.filter((x: any) => x.api === d.target)) tables.add(String(ad.label));
        }
      };
      if (id.startsWith('s:')) { scrs.add(id.slice(2)); addScreenDeps(id.slice(2)); }
      else {
        for (const e of data.involves.filter((x: any) => x.flow === id.slice(2))) { scrs.add(e.screen); addScreenDeps(e.screen); }
      }
      return { screens: scrs, apis, tables };
    };
    const foots = picked.map(id => ({ id, ...foot(id) }));
    const inter = (key: 'screens' | 'apis' | 'tables') =>
      [...foots[0][key]].filter(v => foots.every(f => f[key].has(v))).sort();
    const uniq = (f: any, key: 'screens' | 'apis' | 'tables') =>
      [...f[key]].filter(v => !foots.some(o => o.id !== f.id && o[key].has(v))).sort() as string[];
    return { foots, shared: { screens: inter('screens'), apis: inter('apis'), tables: inter('tables') }, uniq };
  }, [data, picked]);

  const nameOf = (id: string) => id.startsWith('p:')
    ? (data?.processes.find((p: any) => p.slug === id.slice(2))?.name ?? id)
    : id.slice(2);

  const onNodeDoubleClick = useCallback((_e: any, node: Node) => {
    if (node.id.startsWith('s:')) setHelpFor(node.id.slice(2));
  }, []);

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col p-6 pb-3">
      <ScreenHeader title="Flow Map" description="Interactive diagram — business flows, screens, APIs and tables. Click a screen to expand its data deps; double-click for its manual" />
      {helpFor && <HelpPanel screenId={helpFor} open={true} onClose={() => setHelpFor(null)} />}

      {/* ── premium table detail modal ── */}
      {tableInfo && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm" onClick={() => setTableInfo(null)}>
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Database table</div>
                <h2 className="font-mono text-[18px] font-bold text-slate-800">🗄 {tableInfo.name}</h2>
                {tableInfo.tech && (
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    {tableInfo.tech.columns?.length ?? 0} columns · {tableInfo.tech.indexes?.length ?? 0} indexes · {tableInfo.tech.foreign_keys?.length ?? 0} foreign keys
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a href="/console/sys/data-explorer" className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-emerald-400">Open Data Explorer →</a>
                <button onClick={() => setTableInfo(null)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">✕</button>
              </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
              {tableInfo.loading ? (
                <p className="py-10 text-center text-sm text-slate-400">Reading catalog…</p>
              ) : !tableInfo.tech?.columns ? (
                <p className="py-10 text-center text-sm text-slate-400">No technical info available for this table.</p>
              ) : (
                <>
                  <div>
                    <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Columns</h3>
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="w-full text-left text-[11px]">
                        <thead><tr className="border-b border-slate-100 bg-slate-50 text-[9px] uppercase tracking-wider text-slate-400">
                          {['#', 'Column', 'Type', 'Null', 'Default'].map(h => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {tableInfo.tech.columns.map((c: any) => (
                            <tr key={c.column_name} className="border-b border-slate-50">
                              <td className="px-3 py-1.5 text-slate-300">{c.ordinal_position}</td>
                              <td className="px-3 py-1.5 font-mono font-semibold text-slate-700">{c.column_name}</td>
                              <td className="px-3 py-1.5"><code className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">{c.udt_name}{c.character_maximum_length ? `(${c.character_maximum_length})` : ''}</code></td>
                              <td className="px-3 py-1.5">{c.is_nullable === 'YES' ? <span className="text-slate-300">yes</span> : <span className="font-semibold text-red-400">NOT NULL</span>}</td>
                              <td className="max-w-[200px] truncate px-3 py-1.5 font-mono text-[10px] text-slate-400" title={c.column_default ?? ''}>{c.column_default ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Indexes</h3>
                    {(tableInfo.tech.indexes ?? []).length === 0 ? <p className="text-[11px] text-slate-300">none</p> :
                      <div className="space-y-1.5">
                        {tableInfo.tech.indexes.map((ix: any) => (
                          <div key={ix.indexname} className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-semibold text-slate-700">{ix.indexname}</span>
                              {ix.is_unique && <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-700">UNIQUE</span>}
                              {ix.indexname.endsWith('_pkey') && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">PRIMARY</span>}
                            </div>
                            <div className="mt-0.5 font-mono text-[10px] text-slate-400">{ix.indexdef}</div>
                          </div>
                        ))}
                      </div>}
                  </div>

                  <div>
                    <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Foreign keys</h3>
                    {(tableInfo.tech.foreign_keys ?? []).length === 0 ? <p className="text-[11px] text-slate-300">none</p> :
                      <div className="flex flex-wrap gap-2">
                        {tableInfo.tech.foreign_keys.map((fk: any) => (
                          <button key={fk.constraint_name} onClick={() => { void openTable(fk.foreign_table); }}
                            title={fk.constraint_name + ' — click to inspect ' + fk.foreign_table}
                            className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-left hover:border-emerald-400 transition-colors">
                            <span className="font-mono text-[11px] text-slate-700">{fk.column_name}</span>
                            <span className="mx-1.5 text-emerald-500">→</span>
                            <span className="font-mono text-[11px] font-semibold text-emerald-700">{fk.foreign_table}.{fk.foreign_column}</span>
                          </button>
                        ))}
                      </div>}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <BopSelect value={flow} onChange={v => { setFlow(v); setExpanded(new Set()); }}
          options={[{ value: '', label: 'System view — all flows' },
            ...(data?.processes ?? []).map((p: any) => ({ value: p.slug, label: p.name, sublabel: p.module ?? '' }))]}
          className="min-w-[220px]" />
        <input value={fTc} onChange={e => setFTc(e.target.value)} placeholder="TC…"
          className="w-20 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-[11px] focus:outline-none focus:border-orange-400" />
        <input value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder="TC description…"
          className="w-36 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] focus:outline-none focus:border-orange-400" />
        <BopSelect value={fModule} onChange={setFModule}
          options={[{ value: '', label: 'All modules' },
            ...[...new Set((data?.screens ?? []).map((s: any) => s.module).filter(Boolean))].sort()
              .map((m: any) => ({ value: String(m), label: String(m), sublabel: MODULE_NAMES[m] }))]}
          className="min-w-[120px]" />
        {(fTc || fTitle || fModule) && (
          <button onClick={() => { setFTc(''); setFTitle(''); setFModule(''); }}
            className="text-[11px] text-orange-600 hover:underline">Clear</button>
        )}
        <button onClick={() => { setCompare(c => !c); setPicked([]); }}
          className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors ${compare ? 'bg-orange-500 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-orange-400'}`}>
          {compare ? `Compare: pick nodes (${picked.length}/3)` : '⇄ Compare'}
        </button>
        {expanded.size > 0 && (
          <button onClick={() => setExpanded(new Set())} className="text-[11px] text-orange-600 hover:underline">Collapse all deps</button>
        )}
        <span className="ml-auto flex items-center gap-3 text-[10px] text-slate-400">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border-2 border-indigo-500 bg-indigo-50 inline-block" /> flow</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border border-slate-300 bg-white inline-block" /> screen</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border border-blue-300 bg-blue-50 inline-block" /> API</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border border-green-300 bg-green-50 inline-block" /> table</span>
          <span>· edges: <b className="text-indigo-500">involves</b> <b className="text-blue-500">calls</b> <b className="text-green-600">reads</b> <b className="text-amber-500">writes</b></span>
        </span>
      </div>

      {comparison && (
        <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50/40 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-bold text-slate-800">
              Comparing: {picked.map(nameOf).join('  ⇄  ')}
            </h3>
            <button onClick={() => setPicked([])} className="text-[11px] text-orange-600 hover:underline">Reset selection</button>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="rounded-lg border border-emerald-200 bg-white p-3">
              <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Shared by all selected</div>
              {(['screens', 'apis', 'tables'] as const).map(k => (
                <div key={k} className="mt-1.5 text-[11px]">
                  <span className="font-semibold capitalize text-slate-500">{k}: </span>
                  {comparison.shared[k].length
                    ? comparison.shared[k].map(v => <code key={v} className="mr-1 rounded bg-emerald-50 px-1 py-0.5 text-[10px] text-emerald-700">{v}</code>)
                    : <span className="text-slate-300">none</span>}
                </div>
              ))}
            </div>
            {comparison.foots.map((f: any) => (
              <div key={f.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Only in {nameOf(f.id)}</div>
                {(['screens', 'apis', 'tables'] as const).map(k => {
                  const u = comparison.uniq(f, k);
                  return (
                    <div key={k} className="mt-1.5 text-[11px]">
                      <span className="font-semibold capitalize text-slate-500">{k}: </span>
                      {u.length
                        ? u.slice(0, 12).map(v => <code key={v} className="mr-1 rounded bg-slate-100 px-1 py-0.5 text-[10px] text-slate-600">{v}</code>)
                        : <span className="text-slate-300">none</span>}
                      {u.length > 12 && <span className="text-slate-400">+{u.length - 12}</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {!data ? (
          <p className="py-20 text-center text-sm text-slate-400">Loading graph…</p>
        ) : (
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodeClick={onNodeClick} onNodeDoubleClick={onNodeDoubleClick}
            fitView fitViewOptions={{ padding: 0.15 }}
            minZoom={0.15} maxZoom={2} proOptions={{ hideAttribution: true }}>
            <Background gap={18} color="#f1f5f9" />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable nodeStrokeWidth={2} style={{ width: 140, height: 90 }} />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}
