'use client';
import { useState, useEffect, useCallback } from 'react';
import { useScope } from '@/lib/scope-context';
import { ScreenHeader } from '@/components/ScreenBadge';

type Range = '1d' | '3d' | '7d' | '30d' | '90d';

interface AnalyticsData {
  totals: { pageViews: number; sessions: number; listingViews: number; formSubmits: number };
  dailyTrend: { date: string; count: number }[];
  byDevice: { name: string; value: number }[];
  byCountry: { name: string; value: number }[];
  topPages: { page: string; views: number }[];
}

const RANGES: { label: string; value: Range }[] = [
  { label: '24h', value: '1d' },
  { label: '3d',  value: '3d' },
  { label: '7d',  value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
];

function KPI({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const { unit } = useScope();
  const [range, setRange] = useState<Range>('7d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?tenant_id=${unit.id}&range=${range}`);
      const json = await res.json();
      setData(json);
    } catch { setData(null); }
    setLoading(false);
  }, [unit.id, range]);

  useEffect(() => { void load(); }, [load]);

  const maxCount = data ? Math.max(...data.dailyTrend.map(d => d.count), 1) : 1;

  return (
    <div>
      <ScreenHeader title="Analytics" description="Site traffic, sessions and conversions" />

      <div className="mb-5 flex gap-1">
        {RANGES.map(r => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              range === r.value
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {r.label}
          </button>
        ))}
        <button onClick={() => { void load(); }} className="ml-auto rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200">
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-slate-400 text-sm">Loading...</div>
      ) : !data ? (
        <div className="flex h-48 items-center justify-center text-red-400 text-sm">Failed to load analytics</div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KPI label="Page Views"    value={data.totals.pageViews.toLocaleString()} />
            <KPI label="Sessions"      value={data.totals.sessions.toLocaleString()} />
            <KPI label="Listing Views" value={data.totals.listingViews.toLocaleString()} />
            <KPI label="Form Submits"  value={data.totals.formSubmits.toLocaleString()} sub="leads / appointments" />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-5">
              <p className="mb-4 text-sm font-semibold text-slate-700">Daily Page Views (last 30 days)</p>
              <div className="flex h-36 items-end gap-px overflow-hidden">
                {data.dailyTrend.map(d => (
                  <div key={d.date} className="group relative flex-1" title={`${d.date}: ${d.count}`}>
                    <div
                      className="w-full rounded-t bg-blue-500 transition-all group-hover:bg-blue-400"
                      style={{ height: `${Math.round((d.count / maxCount) * 100)}%`, minHeight: d.count > 0 ? '2px' : '0' }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-slate-400">
                <span>{data.dailyTrend[0]?.date}</span>
                <span>{data.dailyTrend[data.dailyTrend.length - 1]?.date}</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="mb-4 text-sm font-semibold text-slate-700">By Device</p>
              <div className="space-y-2">
                {data.byDevice.slice(0, 5).map(d => {
                  const total = data.byDevice.reduce((s, x) => s + x.value, 0);
                  const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                  return (
                    <div key={d.name}>
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span className="capitalize">{d.name}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100">
                        <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-5 py-3">
                <p className="text-sm font-semibold text-slate-700">Top Pages</p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
                  <tr>
                    <th className="px-5 py-2 text-left">Page</th>
                    <th className="px-5 py-2 text-right">Views</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.topPages.map(p => (
                    <tr key={p.page} className="hover:bg-slate-50">
                      <td className="px-5 py-2 font-mono text-xs text-slate-600 truncate max-w-xs">{p.page}</td>
                      <td className="px-5 py-2 text-right text-slate-700">{p.views}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-5 py-3">
                <p className="text-sm font-semibold text-slate-700">By Country</p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
                  <tr>
                    <th className="px-5 py-2 text-left">Country</th>
                    <th className="px-5 py-2 text-right">Events</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.byCountry.map(c => (
                    <tr key={c.name} className="hover:bg-slate-50">
                      <td className="px-5 py-2 text-slate-600 uppercase">{c.name}</td>
                      <td className="px-5 py-2 text-right text-slate-700">{c.value}</td>
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
