'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

// Minimal inline markdown: **bold** and `code`. Enough for Phase-1 help bodies.
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


function HelpGuideTab({ help }: { help: any }) {
  if (!help?.has_docs) return <p className="text-sm text-slate-400">No help authored for this screen yet.</p>;
  return (
    <div className="space-y-5">
      {help.overview && (
        <div>
          <h3 className="mb-1 text-sm font-bold text-slate-800">{help.overview.title || 'Overview'}</h3>
          <p className="text-sm leading-relaxed text-slate-600">{fmt(help.overview.body_md || '')}</p>
        </div>
      )}
      {help.steps?.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">How to</h3>
          <ol className="space-y-2">
            {help.steps.map((s: any, i: number) => (
              <li key={i} className="flex gap-2 text-sm text-slate-600">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-600">{i+1}</span>
                <span><b className="text-slate-700">{s.title}</b> — {fmt(s.body_md || '')}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {help.faq?.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">FAQ</h3>
          <div className="space-y-3">
            {help.faq.map((f: any, i: number) => (
              <div key={i}>
                <p className="text-sm font-semibold text-slate-700">{f.title}</p>
                <p className="text-sm text-slate-600">{fmt(f.body_md || '')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {help.reference?.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Reference</h3>
          <div className="space-y-3">
            {help.reference.map((f: any, i: number) => (
              <div key={i}>
                <p className="text-sm font-semibold text-slate-700">{f.title}</p>
                <p className="whitespace-pre-line text-sm text-slate-600">{fmt(f.body_md || '')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {help.process?.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Business flows</h3>
          <div className="space-y-3">
            {help.process.map((f: any, i: number) => (
              <div key={i} className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
                <p className="text-sm font-semibold text-indigo-700">{f.title}</p>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{fmt(f.body_md || '')}</p>
                <Link href="/console/sys/processes" className="mt-1 inline-block text-[12px] font-semibold text-indigo-600 hover:underline">Full flow manual →</Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HelpTechTab({ tech }: { tech: any }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-3 gap-x-3 gap-y-1">
        <span className="text-slate-400">TC code</span><span className="col-span-2 font-mono text-slate-700">{tech.screen.tc}</span>
        <span className="text-slate-400">Module</span><span className="col-span-2 text-slate-700">{tech.screen.module ?? '—'}</span>
        <span className="text-slate-400">Route</span><span className="col-span-2 font-mono text-[12px] text-slate-700">{tech.screen.route ?? '—'}</span>
        {tech.screen.menu_path && <><span className="text-slate-400">Menu path</span><span className="col-span-2 text-[12px] text-slate-700">{tech.screen.menu_path}</span></>}
        <span className="text-slate-400">Func type</span><span className="col-span-2 text-slate-700">{tech.screen.func_type ?? '—'}</span>
        <span className="text-slate-400">Lifecycle</span><span className="col-span-2 text-slate-700">{tech.screen.lifecycle_state ?? '—'}</span>
        <span className="text-slate-400">Page file</span><span className="col-span-2 font-mono text-[11px] text-slate-500 break-all">{tech.screen.page_file ?? '—'}</span>
      </div>
      <div>
        <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Roles</h3>
        {tech.roles.length === 0 ? <p className="text-slate-400">none</p> :
          <div className="flex flex-wrap gap-1">
            {tech.roles.map((r: any) => (
              <span key={r.role} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                {r.role} <span className="text-slate-400">{r.can_read?'r':''}{r.can_write?'w':''}{r.can_delete?'d':''}</span>
              </span>
            ))}
          </div>}
      </div>
      {tech.tables_touched.length > 0 && (
        <div>
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Tables ({tech.tables_touched.length})</h3>
          <div className="flex flex-wrap gap-1">
            {tech.tables_touched.map((t: string) => (
              <span key={t} className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[10px] text-indigo-700">{t}</span>
            ))}
          </div>
        </div>
      )}
      <div>
        <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">API endpoints &amp; code</h3>
        {tech.apis.length === 0 ? <p className="text-slate-400">No API calls detected in the page source.</p> :
          <ul className="space-y-1.5">
            {tech.apis.map((a: any, i: number) => (
              <li key={i} className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                <div className="flex flex-wrap items-center gap-1">
                  {a.methods.map((mm: string) => (
                    <span key={mm} className="rounded bg-indigo-600 px-1 py-0.5 font-mono text-[9px] font-bold text-white">{mm}</span>
                  ))}
                  <span className="font-mono text-[12px] text-indigo-600">{a.route}</span>
                </div>
                <p className="mt-0.5 font-mono text-[10px] text-slate-400 break-all">{a.file}</p>
                {a.tables.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {a.tables.map((t: string, j: number) => (
                      <span key={j} className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500">{t}</span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>}
        <p className="mt-2 text-[10px] text-slate-300">Source: {tech.source === 'code-scan' ? 'auto-scanned from page + route code' : 'registry only (no page file)'}</p>
      </div>
    </div>
  );
}

export function HelpPanel({ screenId, open, onClose }: { screenId: string; open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<'help' | 'tech'>('help');
  const [help, setHelp] = useState<any>(null);
  const [tech, setTech] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !screenId) return;
    setLoading(true);
    void Promise.all([
      fetch(`/api/bop/sys/help?screen=${screenId}`).then(r => r.json()),
      fetch(`/api/bop/sys/help/tech?screen=${screenId}`).then(r => r.json()),
    ]).then(([h, t]) => { setHelp(h); setTech(t); setLoading(false); });
  }, [open, screenId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-slate-900/30" onClick={onClose}>
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">?</span>
            <span className="font-semibold text-slate-800">Help</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">{screenId}</span>
            {help?.related_docs?.length > 0 && (
              <Link href={`/console/sys/docs?target_type=platform&related_screen=${screenId}`}
                onClick={onClose}
                title={help.related_docs.map((d: any) => d.title).join(', ')}
                className="flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-100">
                📚 {help.related_docs.length}
              </Link>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* tabs */}
        <div className="flex gap-1 border-b border-slate-200 px-4">
          {(['help','tech'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium ${tab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
              {t === 'help' ? 'Guide' : 'Technical'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && <p className="text-sm text-slate-400">Loading…</p>}

          {!loading && tab === 'help' && <HelpGuideTab help={help} />}

          {!loading && tab === 'tech' && tech && <HelpTechTab tech={tech} />}
        </div>

        {/* footer */}
        <div className="border-t border-slate-200 px-5 py-3">
          <Link href={`/console/sys/screen-explorer?screen=${screenId}`} onClick={onClose}
            className="text-sm font-medium text-blue-600 hover:underline">Open full Screen Explorer (SY024) →</Link>
        </div>
      </div>
    </div>
  );
}
