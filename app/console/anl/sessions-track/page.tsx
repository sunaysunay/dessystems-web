'use client';
import { useState, useEffect, useCallback } from 'react';
import { useScope } from '@/lib/scope-context';
import { ScreenHeader } from '@/components/ScreenBadge';

export default function SessionsTrackPage() {
  const { unit } = useScope();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/sessions?tenant_id=${unit.id}&range=3d`);
      const json = await res.json();
      setRows(json.data ?? []);
    } catch { setRows([]); }
    setLoading(false);
  }, [unit.id]);

  useEffect(() => { void load(); }, [load]);

  const filtered = rows.filter(r => !search || r.session_id?.includes(search) || r.country?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <ScreenHeader title="Sessions Track" description="Full session path and page-by-page journey" />
      <div className="mb-5 flex items-center gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search session ID or country..."
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm w-64 focus:outline-none focus:border-blue-400" />
        <span className="ml-auto text-xs text-slate-400">{filtered.length} sessions (last 3 days)</span>
      </div>
      {loading ? <div className="flex h-48 items-center justify-center text-slate-400 text-sm">Loading...</div> : (
        <div className="space-y-2">
          {filtered.length === 0 ? <div className="flex h-48 items-center justify-center text-slate-400 text-sm">No sessions</div>
          : filtered.map((r, i) => {
            const sid = r.session_id || String(i);
            const isOpen = expanded === sid;
            const pages: string[] = r.pages || [];
            return (
              <div key={sid} className="rounded-xl border border-slate-200 bg-white">
                <button onClick={() => setExpanded(isOpen ? null : sid)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-xs text-slate-400">{r.session_id?.slice(0,12) || '—'}</span>
                    <span className="text-xs text-slate-500">{r.started_at ? new Date(r.started_at).toLocaleString() : '—'}</span>
                    <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">{r.page_count ?? pages.length} pages</span>
                    {r.country && <span className="text-xs uppercase text-slate-400">{r.country}</span>}
                    {r.device_type && <span className="capitalize text-xs text-slate-400">{r.device_type}</span>}
                  </div>
                  <svg className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                  </svg>
                </button>
                {isOpen && pages.length > 0 && (
                  <div className="border-t border-slate-100 px-4 py-3">
                    <ol className="space-y-1">
                      {pages.map((page, j) => (
                        <li key={j} className="flex items-center gap-3 text-xs">
                          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">{j+1}</span>
                          <span className="font-mono text-slate-600">{page.replace(/^\/(en|nl|de|fr|tr)/,'') || '/'}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                {isOpen && pages.length === 0 && (
                  <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-400">No page path data available in activity_log2</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
