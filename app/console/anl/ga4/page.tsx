'use client';
import { useState, useEffect, useCallback } from 'react';
import { useScope } from '@/lib/scope-context';
import { ScreenHeader } from '@/components/ScreenBadge';

type Range = '7d' | '30d' | '90d';
interface GA4Row { date: string; sessions: number; users: number; new_users: number; pageviews: number; engaged_sessions: number; bounce_rate: number; avg_session_duration: number }

export default function GA4Page() {
  const { unit } = useScope();
  const [range, setRange] = useState<Range>('30d');
  const [rows, setRows] = useState<GA4Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/analytics/ga4?tenant_id=${unit.id}&range=${range}`);
      const json = await res.json();
      if (json.error) setError(json.error);
      else setRows(json.rows ?? []);
    } catch { setError('Failed to load'); }
    setLoading(false);
  }, [unit.id, range]);

  useEffect(() => { void load(); }, [load]);

  const totals = rows.reduce((s, r) => ({ sessions: s.sessions + r.sessions, users: s.users + r.users, pageviews: s.pageviews + r.pageviews }), { sessions: 0, users: 0, pageviews: 0 });
  const maxPV = Math.max(...rows.map(r => r.pageviews), 1);

  return (
    <div>
      <ScreenHeader title="GA4" description="Google Analytics 4 synced data" />
      <div className="mb-5 flex gap-1">
        {(['7d','30d','90d'] as Range[]).map(r => (
          <button key={r} onClick={() => setRange(r)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${range === r ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{r}</button>
        ))}
      </div>
      {loading ? <div className="flex h-48 items-center justify-center text-slate-400 text-sm">Loading...</div>
       : error ? <div className="flex h-48 items-center justify-center text-red-400 text-sm">{error}</div>
       : rows.length === 0 ? <div className="flex h-48 items-center justify-center text-slate-400 text-sm">No GA4 data synced yet. Run GA4 sync from old admin first.</div>
       : (
        <>
          <div className="mb-5 grid grid-cols-3 gap-4">
            {[{ label:'Sessions', value: totals.sessions }, { label:'Users', value: totals.users }, { label:'Page Views', value: totals.pageviews }].map(k => (
              <div key={k.label} className="rounded-xl border border-slate-200 bg-white px-5 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{k.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{k.value.toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div className="mb-5 rounded-xl border border-slate-200 bg-white p-5">
            <p className="mb-3 text-sm font-semibold text-slate-700">Daily Page Views</p>
            <div className="flex h-32 items-end gap-px">
              {rows.map(r => (
                <div key={r.date} className="group flex-1" title={`${r.date}: ${r.pageviews}`}>
                  <div className="w-full rounded-t bg-orange-400 group-hover:bg-orange-300"
                    style={{ height: `${Math.round((r.pageviews / maxPV) * 100)}%`, minHeight: r.pageviews > 0 ? '2px' : '0' }} />
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-slate-400">
              <span>{rows[0]?.date}</span><span>{rows[rows.length-1]?.date}</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-right">Sessions</th>
                  <th className="px-4 py-2 text-right">Users</th>
                  <th className="px-4 py-2 text-right">New Users</th>
                  <th className="px-4 py-2 text-right">Page Views</th>
                  <th className="px-4 py-2 text-right">Bounce Rate</th>
                  <th className="px-4 py-2 text-right">Avg Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[...rows].reverse().map(r => (
                  <tr key={r.date} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-600">{r.date}</td>
                    <td className="px-4 py-2 text-right">{r.sessions}</td>
                    <td className="px-4 py-2 text-right">{r.users}</td>
                    <td className="px-4 py-2 text-right">{r.new_users}</td>
                    <td className="px-4 py-2 text-right font-semibold">{r.pageviews}</td>
                    <td className="px-4 py-2 text-right">{r.bounce_rate ? `${Math.round(r.bounce_rate * 100)}%` : '—'}</td>
                    <td className="px-4 py-2 text-right text-slate-400">{r.avg_session_duration ? `${Math.round(r.avg_session_duration)}s` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
