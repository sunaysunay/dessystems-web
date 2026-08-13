'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useScope } from '@/lib/scope-context';
import { ScreenHeader } from '@/components/ScreenBadge';

const RANGES = [{ label: '24h', value: '1d' }, { label: '3d', value: '3d' }, { label: '7d', value: '7d' }, { label: '30d', value: '30d' }, { label: '90d', value: '90d' }];
type GroupBy = 'country' | 'region' | 'city';

export default function Page() {
  const { unit } = useScope();
  const [range, setRange] = useState('7d');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupBy>('country');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics/data?tenant_id=' + unit.id + '&range=' + range + '&view=locations');
      const json = await res.json();
      setRows(json.data ?? []);
    } catch { setRows([]); }
    setLoading(false);
  }, [unit.id, range]);

  useEffect(() => { void load(); }, [load]);

  const grouped = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach(r => {
      let key: string;
      if (groupBy === 'city') {
        // do NOT fall back to region/country when city is missing — that would
        // masquerade a country as a city. Datacenter / VPN / IPv6 addresses
        // often have no city in geoip; group those honestly as "Unknown".
        key = r.city ? [r.city, r.region, r.country].filter(Boolean).join(', ') : (r.country ? `Unknown city · ${r.country}` : 'Unknown');
      } else if (groupBy === 'region') {
        key = r.region ? [r.region, r.country].filter(Boolean).join(', ') : (r.country ? `Unknown region · ${r.country}` : 'Unknown');
      } else {
        key = r.country || 'Unknown';
      }
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 50);
  }, [rows, groupBy]);

  const max = grouped[0]?.[1] ?? 1;

  return (
    <div>
      <ScreenHeader title="Locations" description="Visitor geographic breakdown by country, region and city" />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button key={r.value} onClick={() => setRange(r.value)}
              className={'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ' + (range === r.value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-4 border-l border-slate-200 pl-4">
          {(['country', 'region', 'city'] as GroupBy[]).map(g => (
            <button key={g} onClick={() => setGroupBy(g)}
              className={'rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ' + (groupBy === g ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
              {g}
            </button>
          ))}
        </div>
        <span className="ml-auto flex items-center text-xs text-slate-400">{rows.length} events</span>
      </div>
      {(groupBy === 'city' || groupBy === 'region') && (
        <p className="mb-3 text-[11px] text-slate-400">
          City/region come from IP geolocation. Datacenter, VPN and some IPv6 addresses resolve to a country only — those appear as &ldquo;Unknown&rdquo;.
        </p>
      )}
      <div className="rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-slate-400 text-sm">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-5 py-3 text-left capitalize">{groupBy}</th>
                <th className="px-5 py-3 text-left w-64">Distribution</th>
                <th className="px-5 py-3 text-right">Count</th>
                <th className="px-5 py-3 text-right">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {grouped.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-400">No data</td></tr>
              ) : grouped.map(([key, count]) => {
                const pct = rows.length > 0 ? Math.round((count / rows.length) * 100) : 0;
                return (
                  <tr key={key} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5 font-medium text-slate-700">{key}</td>
                    <td className="px-5 py-2.5">
                      <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-blue-500" style={{ width: `${Math.round((count / max) * 100)}%` }} /></div>
                    </td>
                    <td className="px-5 py-2.5 text-right font-semibold text-slate-800">{count}</td>
                    <td className="px-5 py-2.5 text-right text-slate-400">{pct}%</td>
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
