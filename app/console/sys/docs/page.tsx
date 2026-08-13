'use client';
// SY034 — Documentation Browser: full-parameter search over every
// documentation object (screen manuals + flow manuals), with a reader pane
// and inline editorial actions (approve draft → authored, retire, edit).
import { useState, useEffect, useCallback } from 'react';
import { BopSelect } from '@/components/BopSelect';
import { ScreenHeader } from '@/components/ScreenBadge';
import { MODULE_NAMES } from '@/lib/module-labels';

const MODULES = ['', 'AIM', 'ANL', 'AST', 'AUC', 'BOP', 'COM', 'CRM', 'DAE', 'DEV', 'FIN', 'INT', 'LOG', 'MDM', 'MKP', 'MKT', 'OPS', 'PUB', 'SAL', 'SYS', 'WFL', 'WRK'];

const VISUAL_FLOW_MAP: Record<string, { route: string; screen: string }> = {
  'trade-flow-engine': { route: '/console/sys/tfe-flow', screen: 'SY043' },
  'sell-lead-acquisition': { route: '/console/sys/tfe-flow?tab=acquisition', screen: 'SY043' },
  'desshop-commerce': { route: '/console/sys/tfe-flow?tab=desshop', screen: 'SY043' },
  'shortlink-attribution': { route: '/console/sys/tfe-flow?tab=shortlink', screen: 'SY043' },
};
const DOC_TYPES = ['', 'flow', 'visual', 'overview', 'steps', 'faq', 'reference', 'process', 'decision', 'changelog'];
const OWNERS = ['', 'system', 'ai-draft'];
const TARGETS = ['', 'screen', 'process', 'platform'];
const STATUSES = ['', 'active', 'retired'];

function fmt(s: string) {
  const parts: any[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) parts.push(s.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) parts.push(<b key={i++}>{tok.slice(2, -2)}</b>);
    else parts.push(<code key={i++} className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-indigo-600">{tok.slice(1, -1)}</code>);
    last = m.index + tok.length;
  }
  if (last < s.length) parts.push(s.slice(last));
  return parts;
}

export default function DocsBrowserPage() {
  const [q, setQ] = useState('');
  const [targetType, setTargetType] = useState('');
  const [targetId, setTargetId] = useState('');
  const [docType, setDocType] = useState('');
  const [owner, setOwner] = useState('');
  const [status, setStatus] = useState('active');
  const [module, setModule] = useState('');
  const [relatedScreen, setRelatedScreen] = useState('');
  const [page, setPage] = useState(0);
  const LIMIT = 50;

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const rs = sp.get('related_screen');
    const tt = sp.get('target_type');
    if (rs) setRelatedScreen(rs);
    if (tt) setTargetType(tt);
  }, []);

  const [docs, setDocs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (docType === 'visual') {
      p.set('target_type', targetType || 'process');
      p.set('target_id', targetId || Object.keys(VISUAL_FLOW_MAP).join(','));
    } else if (docType === 'flow') {
      p.set('target_type', targetType || 'process');
      if (targetId) p.set('target_id', targetId);
    } else {
      if (targetType) p.set('target_type', targetType);
      if (docType) p.set('doc_type', docType);
      if (targetId) p.set('target_id', targetId);
    }
    if (owner) p.set('owner', owner);
    if (status) p.set('status', status);
    if (module) p.set('module', module);
    if (relatedScreen) p.set('related_screen', relatedScreen);
    p.set('limit', String(LIMIT)); p.set('offset', String(page * LIMIT));
    const j = await fetch(`/api/bop/sys/docs?${p}`).then(r => r.json());
    setDocs(j.docs ?? []); setTotal(j.total ?? 0); setFacets(j.facets ?? {});
    setLoading(false);
  }, [q, targetType, targetId, docType, owner, status, module, relatedScreen, page]);

  useEffect(() => { const t = setTimeout(() => { void load(); }, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { setPage(0); }, [q, targetType, targetId, docType, owner, status, module]);

  async function act(body: any) {
    setBusy(true);
    const j = await fetch('/api/bop/sys/docs', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_id: sel.doc_id, ...body }),
    }).then(r => r.json());
    setBusy(false);
    if (j.ok) { setSel({ ...sel, ...j.doc, body_md: body.body_md ?? sel.body_md }); setEditing(false); void load(); }
  }

  const ownerBadge = (o: string) =>
    o === 'ai-draft'
      ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">draft</span>
      : <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">{o}</span>;

  return (
    <div className="p-6">
      <ScreenHeader title="Documentation Browser" description="Search, read and curate every manual object — screens and business flows" />

      {relatedScreen && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-[12px] text-indigo-700">
          <span>Showing docs related to <span className="font-mono font-bold">{relatedScreen}</span></span>
          <button onClick={() => setRelatedScreen('')} className="ml-auto text-indigo-500 hover:text-indigo-700">Clear ✕</button>
        </div>
      )}

      {/* filter bar */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Full-text search title + body…"
          className="w-64 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] focus:outline-none focus:border-orange-400" />
        <input value={targetId} onChange={e => setTargetId(e.target.value)} placeholder="TC / slug…"
          className="w-28 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-mono focus:outline-none focus:border-orange-400" />
        <BopSelect value={targetType} onChange={v => setTargetType(v)} options={TARGETS.map((t) => ({ value: String(t), label: `${t || 'All targets'}${t && facets.target_type?.[t] ? ` (${facets.target_type[t]})` : ''}` }))} className="min-w-[130px]" />
        <BopSelect value={docType} onChange={v => { setDocType(v); if (v === 'visual' || v === 'flow') { setQ(''); setTargetId(''); } }} options={DOC_TYPES.map((t) => ({ value: String(t), label: t === 'flow' ? '▸ Business flows' : t === 'visual' ? '▸ Visual flows' : `${t || 'All phases'}${t && facets.doc_type?.[t] ? ` (${facets.doc_type[t]})` : ''}` }))} className="min-w-[130px]" />
        <BopSelect value={owner} onChange={v => setOwner(v)} options={OWNERS.map((t) => ({ value: String(t), label: `${t || 'All authors'}${t && facets.owner?.[t] ? ` (${facets.owner[t]})` : ''}` }))} className="min-w-[130px]" />
        <BopSelect value={module} onChange={v => setModule(v)} options={MODULES.map((t) => ({ value: String(t), label: t || 'All modules', sublabel: t ? MODULE_NAMES[t] : undefined }))} className="min-w-[150px]" />
        <BopSelect value={status} onChange={v => setStatus(v)} options={STATUSES.map((t) => ({ value: String(t), label: `${t || 'Any status'}` }))} className="min-w-[130px]" />
        <span className="ml-auto text-[12px] text-slate-400">{total} docs{loading ? ' · loading…' : ''}</span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_540px]">
        {/* results */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
                {['Target', 'Phase', 'Title', 'Author', 'Updated'].map(h => <th key={h} className="px-3 py-2.5 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {docs.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-10 text-center text-slate-400">{loading ? 'Loading…' : 'No documents match these filters.'}</td></tr>
              ) : docs.map(d => (
                <tr key={d.doc_id} onClick={() => { setSel(d); setEditing(false); }}
                  className={`cursor-pointer border-b border-slate-50 transition-colors ${sel?.doc_id === d.doc_id ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}`}>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="font-mono text-[11px] font-bold text-indigo-600">{d.target_id}</span>
                    <span className="ml-1.5 text-slate-500">{d.target_title}</span>
                    {d.target_module && <span className="ml-1.5 rounded bg-slate-100 px-1 py-0.5 text-[9px] text-slate-500">{d.target_module}</span>}
                    {VISUAL_FLOW_MAP[d.target_id] && (
                      <a href={VISUAL_FLOW_MAP[d.target_id].route} onClick={e => e.stopPropagation()}
                        className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-600 hover:bg-blue-100"
                        title={`Open ${VISUAL_FLOW_MAP[d.target_id].screen} Visual Flow`}>
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M1 1v14h14v-2H3V1H1zm3 10l3-4 2 2 4-5v2l-4 5-2-2-3 4v-2z"/></svg>
                        {VISUAL_FLOW_MAP[d.target_id].screen}
                      </a>
                    )}
                  </td>
                  <td className="px-3 py-2"><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{d.doc_type}</span></td>
                  <td className="max-w-[280px] truncate px-3 py-2 text-slate-800">{d.title}</td>
                  <td className="px-3 py-2">{ownerBadge(d.owner)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-400">{d.updated_at ? new Date(d.updated_at).toLocaleDateString('nl-NL') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {total > LIMIT && (
            <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-[12px]">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="text-slate-500 hover:text-slate-700 disabled:opacity-30">← Prev</button>
              <span className="text-slate-400">page {page + 1} / {Math.ceil(total / LIMIT)}</span>
              <button disabled={(page + 1) * LIMIT >= total} onClick={() => setPage(p => p + 1)} className="text-slate-500 hover:text-slate-700 disabled:opacity-30">Next →</button>
            </div>
          )}
        </div>

        {/* reader / editor pane */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 xl:sticky xl:top-4 xl:self-start xl:max-h-[80vh] xl:overflow-y-auto">
          {!sel ? (
            <p className="py-16 text-center text-[13px] text-slate-400">Select a document to read it.</p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] text-slate-400">{sel.target_type}:{sel.target_id} · {sel.doc_type} · v{sel.version ?? 1}</div>
                  <h2 className="mt-0.5 text-[16px] font-bold text-slate-800">{sel.title}</h2>
                </div>
                {ownerBadge(sel.owner)}
              </div>

              {(sel.module || sel.related_screens?.length > 0) && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                  {sel.module && <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-500">{sel.module}</span>}
                  {sel.related_screens?.map((sc: string) => (
                    <button key={sc} onClick={() => { setTargetId(sc); setTargetType('screen'); }}
                      className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono font-semibold text-indigo-600 hover:bg-indigo-100">
                      {sc}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {sel.owner === 'ai-draft' && (
                  <button disabled={busy} onClick={() => { void act({ approve: true }); }}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
                    ✓ Approve (draft → authored)
                  </button>
                )}
                <button disabled={busy} onClick={() => { setEditing(!editing); setEditBody(sel.body_md ?? ''); }}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-orange-400">
                  {editing ? 'Cancel edit' : 'Edit'}
                </button>
                {sel.status === 'active' ? (
                  <button disabled={busy} onClick={() => { if (confirm('Retire this document? It disappears from help panels.')) void act({ status: 'retired' }); }}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-[11px] font-semibold text-red-500 hover:bg-red-50">Retire</button>
                ) : (
                  <button disabled={busy} onClick={() => { void act({ status: 'active' }); }}
                    className="rounded-lg border border-emerald-200 px-3 py-1.5 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-50">Reactivate</button>
                )}
              </div>

              {VISUAL_FLOW_MAP[sel.target_id] && (
                <a href={VISUAL_FLOW_MAP[sel.target_id].route}
                  className="mt-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[12px] text-blue-700 hover:bg-blue-100 transition-colors">
                  <span className="font-semibold">Open Visual Flow Viewer</span>
                  <span className="ml-auto text-blue-400">{VISUAL_FLOW_MAP[sel.target_id].screen} →</span>
                </a>
              )}

              {editing ? (
                <div className="mt-4">
                  <textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={16}
                    className="w-full rounded-lg border border-slate-200 p-3 font-mono text-[12px] focus:outline-none focus:border-orange-400" />
                  <button disabled={busy} onClick={() => { void act({ body_md: editBody }); }}
                    className="mt-2 rounded-lg bg-orange-500 px-4 py-2 text-[12px] font-semibold text-white hover:bg-orange-600 disabled:opacity-40">
                    Save changes
                  </button>
                </div>
              ) : (
                <div className="mt-4 whitespace-pre-line text-[13px] leading-relaxed text-slate-600">{fmt(sel.body_md ?? '')}</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
