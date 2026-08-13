'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useScope } from '@/lib/scope-context';
import { ScreenHeader } from '@/components/ScreenBadge';

const RANGES = [{ label: '24h', value: '1d' }, { label: '3d', value: '3d' }, { label: '7d', value: '7d' }, { label: '30d', value: '30d' }, { label: '90d', value: '90d' }];
type GroupBy = 'device' | 'os' | 'browser' | 'resolution';

function parseBrowserFromUA(ua: string | null): string {
  if (!ua) return 'Unknown';
  const u = ua.toLowerCase();
  if (u.includes('edg/') || u.includes('edga/') || u.includes('edgios/')) return 'Edge';
  if (u.includes('opr/') || u.includes('opera')) return 'Opera';
  if (u.includes('vivaldi')) return 'Vivaldi';
  if (u.includes('samsungbrowser')) return 'Samsung';
  if (u.includes('firefox') || u.includes('fxios')) return 'Firefox';
  if (u.includes('crios') || (u.includes('chrome') && !u.includes('chromium'))) return 'Chrome';
  if (u.includes('safari') && !u.includes('chrome')) return 'Safari';
  return 'Other';
}

export default function Page() {
  const { unit } = useScope();
  const [range, setRange] = useState('7d');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupBy>('device');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics/data?tenant_id=' + unit.id + '&range=' + range + '&view=devices');
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
      if (groupBy === 'os') key = r.os_platform || 'Unknown';
      else if (groupBy === 'browser') key = parseBrowserFromUA(r.user_agent);
      else if (groupBy === 'resolution') key = r.screen_resolution || 'Unknown';
      else key = r.device_type || 'Unknown';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 30);
  }, [rows, groupBy]);

  const max = grouped[0]?.[1] ?? 1;
  const colors: Record<GroupBy, string> = { device: 'bg-blue-500', os: 'bg-emerald-500', browser: 'bg-violet-500', resolution: 'bg-amber-500' };

  return (
    <div>
      <ScreenHeader title="Devices" description="Device type, OS, browser and screen resolution breakdown" />
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
          {(['device', 'os', 'browser', 'resolution'] as GroupBy[]).map(g => (
            <button key={g} onClick={() => setGroupBy(g)}
              className={'rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ' + (groupBy === g ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
              {g === 'os' ? 'OS' : g}
            </button>
          ))}
        </div>
        <span className="ml-auto flex items-center text-xs text-slate-400">{rows.length} events</span>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-slate-400 text-sm">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-5 py-3 text-left capitalize">{groupBy === 'os' ? 'OS' : groupBy}</th>
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
                    <td className="px-5 py-2.5 font-medium text-slate-700 capitalize">{key}</td>
                    <td className="px-5 py-2.5">
                      <div className="h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${colors[groupBy]}`} style={{ width: `${Math.round((count / max) * 100)}%` }} /></div>
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
