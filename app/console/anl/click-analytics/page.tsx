'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useScope } from '@/lib/scope-context';
import { ScreenHeader } from '@/components/ScreenBadge';

export default function ClickAnalyticsPage() {
  const { unit } = useScope();
  const [range, setRange] = useState('7d');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/data?tenant_id=${unit.id}&range=${range}&view=click_events`);
      const json = await res.json();
      setRows(json.data ?? []);
    } catch { setRows([]); }
    setLoading(false);
  }, [unit.id, range]);

  useEffect(() => { void load(); }, [load]);

  const byCTA = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach(r => {
      const label = r.metadata?.label || r.metadata?.element || r.metadata?.text || r.page || 'unknown';
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0, 20);
  }, [rows]);

  const byPage = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach(r => { const p = r.page || 'unknown'; map[p] = (map[p] || 0) + 1; });
    return Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0, 10);
  }, [rows]);

  const max = byCTA[0]?.[1] ?? 1;

  return (
    <div>
      <ScreenHeader title="Click Analytics" description="CTA performance and click heatmap by element" />
      <div className="mb-5 flex gap-1">
        {['1d','3d','7d','30d'].map(r => (
          <button key={r} onClick={() => setRange(r)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${range === r ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{r}</button>
        ))}
        <span className="ml-auto flex items-center text-xs text-slate-400">{rows.length} click events</span>
      </div>
      {loading ? <div className="flex h-48 items-center justify-center text-slate-400 text-sm">Loading...</div> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Top CTAs / Elements</div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-2 text-left">Element</th>
                  <th className="px-4 py-2 text-left w-40">Bar</th>
                  <th className="px-4 py-2 text-right">Clicks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {byCTA.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">No click events</td></tr>
                ) : byCTA.map(([label, count]) => (
                  <tr key={label} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-700 truncate max-w-[200px]">{label}</td>
                    <td className="px-4 py-2">
                      <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-amber-500" style={{ width: `${Math.round((count/max)*100)}%` }} /></div>
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-slate-800">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Clicks by Page</div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
                <tr><th className="px-4 py-2 text-left">Page</th><th className="px-4 py-2 text-right">Clicks</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {byPage.map(([page, count]) => (
                  <tr key={page} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono text-xs text-slate-600 truncate max-w-xs">{page.replace(/^\/(en|nl|de|fr|tr)/,'') || '/'}</td>
                    <td className="px-4 py-2 text-right font-semibold text-slate-800">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
