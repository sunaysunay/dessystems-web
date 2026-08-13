'use client';
import { useState, useEffect, useCallback } from 'react';
import { useScope } from '@/lib/scope-context';
import { ScreenHeader } from '@/components/ScreenBadge';

const RANGES = [{ label: '24h', value: '1d' }, { label: '3d', value: '3d' }, { label: '7d', value: '7d' }, { label: '30d', value: '30d' }, { label: '90d', value: '90d' }];
const EVT_COLOR: Record<string, string> = { page_view:'bg-blue-100 text-blue-700', listing_view:'bg-violet-100 text-violet-700', lead_submitted:'bg-green-100 text-green-700', form_submit:'bg-green-100 text-green-700', appointment_submit:'bg-emerald-100 text-emerald-700', click:'bg-amber-100 text-amber-700', not_found:'bg-red-100 text-red-600', login_failed:'bg-orange-100 text-orange-700', login_success:'bg-green-100 text-green-700', suspicious_activity:'bg-red-100 text-red-700' };

export default function Page() {
  const { unit } = useScope();
  const [range, setRange] = useState('7d');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics/data?tenant_id=' + unit.id + '&range=' + range + '&view=recent');
      const json = await res.json();
      setRows(json.data ?? []);
    } catch { setRows([]); }
    setLoading(false);
  }, [unit.id, range]);

  useEffect(() => { void load(); }, [load]);

  const filtered = rows.filter(r => !search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <ScreenHeader title="Recent Activity" description="Live recent event stream across all types" />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button key={r.value} onClick={() => setRange(r.value)}
              className={'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ' + (range === r.value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
              {r.label}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm w-48 focus:outline-none focus:border-blue-400" />
        <span className="ml-auto text-xs text-slate-400">{filtered.length} rows</span>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-slate-400 text-sm">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-2 text-left">Time</th>
                  <th className="px-4 py-2 text-left">Event</th>
                  <th className="px-4 py-2 text-left">Page / Content</th>
                  <th className="px-4 py-2 text-left">Location</th>
                  <th className="px-4 py-2 text-left">Device</th>
                  <th className="px-4 py-2 text-left">Session</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No data</td></tr>
                ) : filtered.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-xs text-slate-400">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2"><span className={'rounded px-1.5 py-0.5 text-xs font-medium ' + (EVT_COLOR[r.event_type] ?? 'bg-slate-100 text-slate-500')}>{r.event_type?.replace(/_/g,' ')}</span></td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-600 max-w-xs truncate">{r.listing_title || r.page || '—'}</td>
                    <td className="px-4 py-2 text-xs text-slate-400">{[r.city, r.country].filter(Boolean).join(', ') || '—'}</td>
                    <td className="px-4 py-2 text-xs capitalize text-slate-400">{r.device_type || '—'}</td>
                    <td className="px-4 py-2 font-mono text-[10px] text-slate-300">{r.session_id?.slice(0,8) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
