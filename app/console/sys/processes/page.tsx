'use client';
// SY033 — Process Library: every documented business flow end-to-end, with
// participating screens as clickable TC chips (opens the screen's manual).
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { HelpPanel } from '@/components/HelpPanel';
import { BopSelect } from '@/components/BopSelect';
import { MODULE_NAMES } from '@/lib/module-labels';

// TC prefix → module code (screens carry 2-letter TC families)
const PREFIX_TO_MODULE: Record<string, string> = {
  SA: 'SAL', MP: 'MKP', CR: 'CRM', FI: 'FIN', IN: 'INV', MD: 'MDM', SY: 'SYS',
  DV: 'DEV', AI: 'AIM', MK: 'MKT', AU: 'AUC', AS: 'AST', LG: 'LOG', WR: 'WRK',
  BO: 'BOP', AN: 'ANL', OP: 'OPS', IT: 'INT', PB: 'PUB', CM: 'COM', WF: 'WFL', PT: 'PRT',
};

// minimal markdown: **bold**, `code`, line breaks
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

export default function ProcessLibraryPage() {
  const [procs, setProcs] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [helpFor, setHelpFor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // search filters
  const [q, setQ] = useState('');
  const [tc, setTc] = useState('');
  const [module, setModule] = useState('');

  useEffect(() => {
    void fetch('/api/bop/sys/processes').then(r => r.json())
      .then(j => { setProcs(j.processes ?? []); setLoading(false); });
  }, []);

  // module list derived from participating screens (TC prefix ≈ module family)
  const moduleOf = (id: string) => id.slice(0, 2);
  const modules = [...new Set(procs.flatMap(p => p.screens.map((s: any) => moduleOf(s.id))))].sort();

  const filtered = procs.filter(p => {
    if (q) {
      const hay = [
        p.name, p.slug,
        p.overview?.body_md ?? '',
        ...p.steps.map((s: any) => s.title + ' ' + s.body_md),
        ...p.faq.map((f: any) => f.title + ' ' + f.body_md),
      ].join(' ').toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    if (tc && !p.screens.some((s: any) => s.id.toLowerCase().includes(tc.toLowerCase()))) return false;
    if (module && !p.screens.some((s: any) => moduleOf(s.id) === module)) return false;
    return true;
  });

  const inputCls = 'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] focus:outline-none focus:border-orange-400';

  return (
    <div className="p-6">
      <ScreenHeader title="Process Library" description="End-to-end business flow manuals — how the screens chain into processes" />
      {helpFor && <HelpPanel screenId={helpFor} open={true} onClose={() => setHelpFor(null)} />}

      {/* search filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="Full-text search flows (name, steps, FAQ)…" className={`${inputCls} w-72`} />
        <input value={tc} onChange={e => setTc(e.target.value)}
          placeholder="Screen TC (e.g. SA013)…" className={`${inputCls} w-40 font-mono`} />
        <BopSelect value={module} onChange={v => setModule(v)}
          options={[{ value: '', label: 'All screen families' },
            ...modules.map(m => ({ value: String(m), label: m + 'xxx', sublabel: MODULE_NAMES[PREFIX_TO_MODULE[m] ?? m] }))]}
          className="min-w-[170px]" />
        {(q || tc || module) && (
          <button onClick={() => { setQ(''); setTc(''); setModule(''); }}
            className="text-[11px] text-orange-600 hover:underline">Clear filters</button>
        )}
        <span className="ml-auto text-[12px] text-slate-400">{filtered.length} / {procs.length} flows</span>
      </div>

      {loading ? <p className="mt-6 text-sm text-slate-400">Loading…</p> : filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm text-slate-400">No flows match these filters.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {filtered.map(p => (
            <div key={p.slug} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <button onClick={() => setOpen(open === p.slug ? null : p.slug)}
                className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold text-slate-800">{p.name}</span>
                    {(p.modules ?? []).map((m: string) => (
                      <span key={m} title={MODULE_NAMES[m] ?? m}
                        className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">{m}</span>
                    ))}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-slate-400">
                    process:{p.slug} · {p.screens.length} screens
                    {(p.modules ?? []).length > 0 && <span className="ml-1.5 font-sans">· {(p.modules ?? []).map((m: string) => MODULE_NAMES[m] ?? m).join(' + ')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {p.screens.slice(0, 6).map((s: any) => (
                    <span key={s.id} className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-indigo-600">{s.id}</span>
                  ))}
                  {p.screens.length > 6 && <span className="text-[10px] text-slate-400">+{p.screens.length - 6}</span>}
                  <span className={`ml-2 text-slate-400 transition-transform ${open === p.slug ? 'rotate-180' : ''}`}>▾</span>
                </div>
              </button>

              {open === p.slug && (
                <div className="border-t border-slate-100 px-5 py-4 space-y-4">
                  {p.overview && (
                    <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{fmt(p.overview.body_md)}</p>
                  )}
                  {p.steps.map((st: any, i: number) => (
                    <div key={i}>
                      <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">{st.title}</h4>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{fmt(st.body_md)}</p>
                    </div>
                  ))}
                  {p.faq.length > 0 && (
                    <div>
                      <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">FAQ</h4>
                      {p.faq.map((f: any, i: number) => (
                        <div key={i} className="mb-2">
                          <p className="text-sm font-semibold text-slate-700">{f.title}</p>
                          <p className="text-sm text-slate-600">{fmt(f.body_md)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div>
                    <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">Participating screens</h4>
                    <div className="flex flex-wrap gap-2">
                      {p.screens.map((s: any) => (
                        <button key={s.id} onClick={() => setHelpFor(s.id)}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
                          title={`Open this screen's manual${s.module ? ` · ${MODULE_NAMES[s.module] ?? s.module}` : ''}`}>
                          <span className="font-mono text-[10px] font-bold text-indigo-600">{s.id}</span>
                          {s.title}
                          {s.module && <span className="rounded bg-slate-100 px-1 py-0.5 text-[9px] text-slate-400">{s.module}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
