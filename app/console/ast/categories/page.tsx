'use client';
import { useState, useEffect } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

const LOCALES = ['en', 'nl', 'de', 'fr', 'tr'] as const;

function Chevron({ open }: { open: boolean }) {
  return (
    <svg className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export default function IN003Categories() {
  const [tree, setTree] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetch('/api/bop/mkp/taxonomy')
      .then(r => r.json())
      .then(j => { if (j.error) setError(j.error); else setTree(j.categories ?? []); setLoading(false); })
      .catch(() => { setError('Failed to load taxonomy'); setLoading(false); });
  }, []);

  const needle = q.trim().toLowerCase();
  const matches = (s: any) =>
    !needle ||
    String(s.code).includes(needle) ||
    s.slug.toLowerCase().includes(needle) ||
    Object.values(s.labels ?? {}).some((l: any) => String(l).toLowerCase().includes(needle));

  // When searching, keep mains whose own fields match OR that contain a matching sub, and auto-expand.
  const visible = tree
    .map(c => ({ ...c, subsVisible: (c.subs ?? []).filter(matches) }))
    .filter(c => matches(c) || c.subsVisible.length > 0);

  return (
    <div>
      <ScreenHeader title="Listing Categories" description="Numeric taxonomy — main categories (1000-step codes) and body type subcategories. Labels per locale live in separate i18n tables." />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search code, slug, or label…"
            className="w-72 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none" />
          <span className="text-xs text-slate-400">{tree.length} main · {tree.reduce((n, c) => n + (c.subs?.length ?? 0), 0)} subcategories</span>
        </div>

        {loading && <div className="px-5 py-10 text-center text-sm text-slate-400">Loading…</div>}
        {error && <div className="px-5 py-10 text-center text-sm text-red-500">{error}</div>}
        {!loading && !error && visible.length === 0 && <div className="px-5 py-10 text-center text-sm text-slate-400">No categories match “{q}”.</div>}

        {!loading && !error && visible.map(c => {
          const isOpen = needle ? true : !!open[c.code];
          return (
            <div key={c.code} className="border-b border-slate-100 last:border-b-0">
              <button onClick={() => setOpen(o => ({ ...o, [c.code]: !o[c.code] }))}
                className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-slate-50">
                <Chevron open={isOpen} />
                <span className="w-14 font-mono text-sm font-bold text-blue-600">{c.code}</span>
                <span className="flex-1 text-sm font-semibold text-slate-800">{c.labels?.en ?? c.slug}</span>
                <span className="w-36 truncate font-mono text-xs text-slate-400">{c.slug}</span>
                <span className="w-24 text-right text-xs text-slate-500">{c.subs?.length ?? 0} subs</span>
                <span className={`w-24 text-right text-xs ${c.listings ? 'font-semibold text-emerald-600' : 'text-slate-300'}`}>{c.listings} listings</span>
                {!c.active && <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-400">inactive</span>}
              </button>

              {isOpen && (
                <div className="bg-slate-50/60 px-5 pb-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] font-semibold uppercase text-slate-400">
                        <th className="w-20 py-2 pl-7">Code</th>
                        <th className="py-2">Label (EN)</th>
                        <th className="py-2">Slug</th>
                        {LOCALES.slice(1).map(l => <th key={l} className="py-2">{l.toUpperCase()}</th>)}
                        <th className="w-20 py-2 text-right">Listings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(needle ? c.subsVisible : c.subs).map((s: any) => (
                        <tr key={s.code} className="text-slate-600">
                          <td className="py-2 pl-7 font-mono text-xs font-semibold text-slate-500">{s.code}</td>
                          <td className="py-2 font-medium text-slate-800">{s.labels?.en ?? s.slug}</td>
                          <td className="py-2 font-mono text-xs text-slate-400">{s.slug}</td>
                          {LOCALES.slice(1).map(l => <td key={l} className="py-2 text-xs">{s.labels?.[l] ?? <span className="text-slate-300">—</span>}</td>)}
                          <td className={`py-2 text-right text-xs ${s.listings ? 'font-semibold text-emerald-600' : 'text-slate-300'}`}>{s.listings}</td>
                        </tr>
                      ))}
                      {(needle ? c.subsVisible : c.subs).length === 0 && (
                        <tr><td colSpan={9} className="py-3 pl-7 text-xs text-slate-400">No subcategories.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-slate-400">Taxonomy is data-managed (migrations 31–33). Adding categories or languages is a data insert — no code change.</p>
    </div>
  );
}
