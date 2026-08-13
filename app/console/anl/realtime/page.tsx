'use client';
import { useState, useEffect, useCallback } from 'react';
import { useScope } from '@/lib/scope-context';
import { ScreenHeader } from '@/components/ScreenBadge';

interface RealtimeData {
  active_30m: number; active_5m: number; active_1m: number; total_events_30m: number;
  per_minute: { minute: string; sessions: number; events: number }[];
  top_pages: { page: string; views: number; sessions: number }[];
  top_countries: { country: string; sessions: number }[];
  top_devices: { device: string; sessions: number }[];
  active_listings: { listing_id: string; title: string; sessions: number }[];
  recent_events: { created_at: string; event_type: string; page: string; listing_title: string | null; country: string | null; city: string | null; device_type: string | null; session_short: string }[];
  fetched_at: string;
}

const EVT_COLOR: Record<string, string> = {
  page_view: 'bg-blue-100 text-blue-700', listing_view: 'bg-violet-100 text-violet-700',
  lead_submitted: 'bg-green-100 text-green-700', form_submit: 'bg-green-100 text-green-700',
  appointment_submit: 'bg-emerald-100 text-emerald-700', click: 'bg-amber-100 text-amber-700',
  not_found: 'bg-red-100 text-red-600',
};

export default function RealtimePage() {
  const { unit } = useScope();
  const [data, setData] = useState<RealtimeData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/analytics/realtime?tenant_id=${unit.id}`);
      setData(await res.json());
    } catch { setData(null); }
    setLoading(false);
  }, [unit.id]);

  useEffect(() => { void load(); const t = setInterval(() => { void load(); }, 30000); return () => clearInterval(t); }, [load]);

  const maxSessions = data ? Math.max(...data.per_minute.map(p => p.sessions), 1) : 1;

  return (
    <div>
      <ScreenHeader title="Realtime" description="Live visitor activity — auto-refreshes every 30s" />
      {loading ? <div className="flex h-48 items-center justify-center text-slate-400 text-sm">Loading...</div> : !data ? <div className="flex h-48 items-center justify-center text-red-400 text-sm">No data</div> : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Active now (1m)',  value: data.active_1m,  color: 'text-green-600' },
              { label: 'Active (5m)',      value: data.active_5m,  color: 'text-blue-600' },
              { label: 'Active (30m)',     value: data.active_30m, color: 'text-slate-800' },
              { label: 'Events (30m)',     value: data.total_events_30m, color: 'text-slate-800' },
            ].map(k => (
              <div key={k.label} className="rounded-xl border border-slate-200 bg-white px-5 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{k.label}</p>
                <p className={`mt-1 text-3xl font-bold ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Per-minute sparkline */}
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
            <p className="mb-3 text-sm font-semibold text-slate-700">Sessions per minute (last 30 min)</p>
            <div className="flex h-24 items-end gap-px">
              {data.per_minute.map(p => (
                <div key={p.minute} className="group relative flex-1" title={`${p.minute}: ${p.sessions} sessions`}>
                  <div className="w-full rounded-t bg-green-500 transition-all group-hover:bg-green-400"
                    style={{ height: `${Math.round((p.sessions / maxSessions) * 100)}%`, minHeight: p.sessions > 0 ? '2px' : '0' }} />
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-slate-400">
              <span>{data.per_minute[0]?.minute}</span>
              <span>{data.per_minute[data.per_minute.length - 1]?.minute}</span>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Top Pages */}
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Top Pages</div>
              <ul className="divide-y divide-slate-50">
                {data.top_pages.map(p => (
                  <li key={p.page} className="flex items-center justify-between px-4 py-2 text-xs">
                    <span className="truncate font-mono text-slate-600 max-w-[160px]">{p.page}</span>
                    <span className="ml-2 font-semibold text-slate-800">{p.sessions}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Top Countries */}
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Top Countries</div>
              <ul className="divide-y divide-slate-50">
                {data.top_countries.map(c => (
                  <li key={c.country} className="flex items-center justify-between px-4 py-2 text-xs">
                    <span className="uppercase text-slate-600">{c.country}</span>
                    <span className="font-semibold text-slate-800">{c.sessions}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Active Listings */}
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Active Listings</div>
              <ul className="divide-y divide-slate-50">
                {data.active_listings.map(l => (
                  <li key={l.listing_id} className="flex items-center justify-between px-4 py-2 text-xs">
                    <span className="truncate text-slate-600 max-w-[160px]">{l.title}</span>
                    <span className="ml-2 font-semibold text-slate-800">{l.sessions}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Recent event stream */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Recent Events</p>
              <p className="text-xs text-slate-400">Updated {new Date(data.fetched_at).toLocaleTimeString()}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-[10px] font-semibold uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-2 text-left">Time</th>
                    <th className="px-4 py-2 text-left">Event</th>
                    <th className="px-4 py-2 text-left">Page</th>
                    <th className="px-4 py-2 text-left">Location</th>
                    <th className="px-4 py-2 text-left">Device</th>
                    <th className="px-4 py-2 text-left">Session</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.recent_events.map((ev, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-1.5 text-slate-400">{new Date(ev.created_at).toLocaleTimeString()}</td>
                      <td className="px-4 py-1.5">
                        <span className={`rounded px-1.5 py-0.5 font-medium ${EVT_COLOR[ev.event_type] ?? 'bg-slate-100 text-slate-500'}`}>{ev.event_type.replace('_',' ')}</span>
                      </td>
                      <td className="px-4 py-1.5 font-mono text-slate-500 max-w-[180px] truncate">{ev.listing_title || ev.page}</td>
                      <td className="px-4 py-1.5 text-slate-400">{[ev.city, ev.country].filter(Boolean).join(', ') || '—'}</td>
                      <td className="px-4 py-1.5 capitalize text-slate-400">{ev.device_type || '—'}</td>
                      <td className="px-4 py-1.5 font-mono text-slate-300">{ev.session_short}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
