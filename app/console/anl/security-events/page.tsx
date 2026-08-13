'use client';
import { useState, useEffect, useCallback } from 'react';
import { useScope } from '@/lib/scope-context';
import { ScreenHeader } from '@/components/ScreenBadge';

const SEV_COLOR: Record<string, string> = {
  login_failed: 'bg-orange-100 text-orange-700',
  login_success: 'bg-green-100 text-green-700',
  suspicious_activity: 'bg-red-100 text-red-700',
  rate_limited: 'bg-yellow-100 text-yellow-700',
  blocked: 'bg-red-200 text-red-800',
};

export default function SecurityEventsPage() {
  const { unit } = useScope();
  const [range, setRange] = useState('7d');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/data?tenant_id=${unit.id}&range=${range}&view=security`);
      const json = await res.json();
      setRows(json.data ?? []);
    } catch { setRows([]); }
    setLoading(false);
  }, [unit.id, range]);

  useEffect(() => { void load(); }, [load]);

  const counts: Record<string, number> = {};
  rows.forEach(r => { const t = r.event_type || 'unknown'; counts[t] = (counts[t] || 0) + 1; });

  const filtered = rows.filter(r => !search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <ScreenHeader title="Security Events" description="Failed logins, suspicious activity and security log" />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {['1d','3d','7d','30d','90d'].map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${range === r ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{r}</button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search IP, page, event..."
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm w-48 focus:outline-none focus:border-red-400" />
      </div>

      {/* Summary badges */}
      <div className="mb-5 flex flex-wrap gap-3">
        {Object.entries(counts).map(([type, count]) => (
          <div key={type} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${SEV_COLOR[type] ?? 'bg-slate-100 text-slate-600'}`}>
            <span className="capitalize">{type.replace(/_/g,' ')}</span>
            <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-xs font-bold">{count}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        {loading ? <div className="flex h-48 items-center justify-center text-slate-400 text-sm">Loading...</div> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-4 py-2 text-left">Time</th>
                <th className="px-4 py-2 text-left">Event</th>
                <th className="px-4 py-2 text-left">IP</th>
                <th className="px-4 py-2 text-left">Page</th>
                <th className="px-4 py-2 text-left">Country</th>
                <th className="px-4 py-2 text-left">User Agent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No security events</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-xs text-slate-400">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${SEV_COLOR[r.event_type] ?? 'bg-slate-100 text-slate-500'}`}>{r.event_type?.replace(/_/g,' ')}</span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-600">{r.ip_address || r.metadata?.ip || '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-500 max-w-[160px] truncate">{r.page || r.metadata?.pathname || '—'}</td>
                  <td className="px-4 py-2 text-xs uppercase text-slate-400">{r.country || '—'}</td>
                  <td className="px-4 py-2 text-xs text-slate-300 max-w-[200px] truncate">{r.user_agent || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
