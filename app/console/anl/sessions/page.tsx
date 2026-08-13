'use client';
import { useState, useEffect, useCallback } from 'react';
import { useScope } from '@/lib/scope-context';
import { ScreenHeader } from '@/components/ScreenBadge';

type Range = '1d' | '3d' | '7d' | '30d' | '90d';

export default function SessionsPage() {
  const { unit } = useScope();
  const [range, setRange] = useState<Range>('7d');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/sessions?tenant_id=${unit.id}&range=${range}`);
      const json = await res.json();
      setRows(json.data ?? []);
    } catch { setRows([]); }
    setLoading(false);
  }, [unit.id, range]);

  useEffect(() => { void load(); }, [load]);

  const filtered = rows.filter(r => !search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <ScreenHeader title="Sessions" description="Session list with page depth, duration, location, device, browser, UTM, referrer and entry/exit pages" />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {(['1d','3d','7d','30d','90d'] as Range[]).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${range === r ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{r}</button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm w-48 focus:outline-none focus:border-blue-400" />
        <span className="ml-auto text-xs text-slate-400">{filtered.length} sessions</span>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        {loading ? <div className="flex h-48 items-center justify-center text-slate-400 text-sm">Loading...</div> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
              {/* column order mirrors dessiteAG_V4 sessions dashboard; Browser + UTM appended as BOP extras */}
              <tr>
                <th className="px-4 py-2 text-left">Started</th>
                <th className="px-4 py-2 text-left">Session</th>
                <th className="px-4 py-2 text-right">Duration</th>
                <th className="px-4 py-2 text-right">Pages</th>
                <th className="px-4 py-2 text-left">Entry Page</th>
                <th className="px-4 py-2 text-left">Exit Page</th>
                <th className="px-4 py-2 text-left">Location</th>
                <th className="px-4 py-2 text-left">Device</th>
                <th className="px-4 py-2 text-left">Referrer</th>
                <th className="px-4 py-2 text-left">Browser</th>
                <th className="px-4 py-2 text-left">UTM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-10 text-center text-slate-400">No sessions</td></tr>
              ) : filtered.map((r, i) => {
                const cc = r.country || r.country_code;
                const locDetail = [r.city, r.region].filter(Boolean).join(', ');
                const utmParts = [r.utm_source, r.utm_medium, r.utm_campaign].filter(Boolean);
                let ref = '—';
                if (r.referrer) { try { ref = new URL(r.referrer).hostname.replace(/^www\./, ''); } catch { ref = r.referrer; } }
                return (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap">{r.started_at ? new Date(r.started_at).toLocaleString() : '—'}</td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-400 whitespace-nowrap">
                      <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${r.is_bounce ? 'bg-red-400' : 'bg-emerald-400'}`} title={r.is_bounce ? 'bounced' : 'engaged'} />
                      {r.session_id?.slice(0,12) || '—'}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-500">{r.duration_sec ? `${Math.round(r.duration_sec)}s` : '—'}</td>
                    <td className="px-4 py-2 text-right font-semibold text-slate-800">{r.page_count ?? '—'}</td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-500 max-w-xs truncate" title={r.entry_page || ''}>{r.entry_page || '—'}</td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-500 max-w-xs truncate" title={r.exit_page || ''}>{r.exit_page || '—'}</td>
                    <td className="px-4 py-2 text-xs whitespace-nowrap">
                      {cc ? (<><span className="font-semibold text-slate-700">{cc}</span>{locDetail && <span className="ml-1 text-slate-400">({locDetail})</span>}</>) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-2 capitalize text-xs text-slate-400">{r.device_type || '—'}</td>
                    <td className="px-4 py-2 text-xs text-slate-400 max-w-[140px] truncate" title={r.referrer || ''}>{ref}</td>
                    <td className="px-4 py-2 text-xs text-slate-500">{r.browser || '—'}</td>
                    <td className="px-4 py-2 text-xs text-slate-400 max-w-[120px] truncate" title={utmParts.join(' / ')}>{utmParts.length > 0 ? utmParts.join(' / ') : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
