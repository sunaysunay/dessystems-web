'use client';
import { useState, useEffect, useCallback } from 'react';
import { useScope } from '@/lib/scope-context';
import { ScreenHeader } from '@/components/ScreenBadge';

type Range = '7d' | '30d' | '90d';

export default function CFGAComparePage() {
  const { unit } = useScope();
  const [range, setRange] = useState<Range>('30d');
  const [cfData, setCfData] = useState<any[]>([]);
  const [ga4Data, setGa4Data] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cfRes, ga4Res] = await Promise.all([
        fetch(`/api/analytics/data?tenant_id=${unit.id}&range=${range}&view=cloudflare`),
        fetch(`/api/analytics/ga4?tenant_id=${unit.id}&range=${range}`),
      ]);
      const cf = await cfRes.json(); setCfData(cf.data ?? []);
      const ga = await ga4Res.json(); setGa4Data(ga.rows ?? []);
    } catch { setCfData([]); setGa4Data([]); }
    setLoading(false);
  }, [unit.id, range]);

  useEffect(() => { void load(); }, [load]);

  const allDates = [...new Set([...cfData.map(r => r.date), ...ga4Data.map(r => r.date)])].sort();
  const cfMap = Object.fromEntries(cfData.map(r => [r.date, r]));
  const gaMap = Object.fromEntries(ga4Data.map(r => [r.date, r]));

  return (
    <div>
      <ScreenHeader title="CF & GA Compare" description="Cloudflare vs Google Analytics traffic comparison" />
      <div className="mb-5 flex gap-1">
        {(['7d','30d','90d'] as Range[]).map(r => (
          <button key={r} onClick={() => setRange(r)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${range === r ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{r}</button>
        ))}
      </div>
      {loading ? <div className="flex h-48 items-center justify-center text-slate-400 text-sm">Loading...</div>
       : allDates.length === 0 ? <div className="flex h-48 items-center justify-center text-slate-400 text-sm">No comparison data. Sync both CF and GA4 from old admin first.</div>
       : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-right text-sky-600">CF Requests</th>
                <th className="px-4 py-3 text-right text-sky-600">CF Page Views</th>
                <th className="px-4 py-3 text-right text-sky-600">CF Visitors</th>
                <th className="px-4 py-3 text-right text-orange-500">GA4 Sessions</th>
                <th className="px-4 py-3 text-right text-orange-500">GA4 Users</th>
                <th className="px-4 py-3 text-right text-orange-500">GA4 Page Views</th>
                <th className="px-4 py-3 text-right">CF/GA Ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[...allDates].reverse().map(date => {
                const cf = cfMap[date];
                const ga = gaMap[date];
                const ratio = ga?.pageviews && cf?.pageviews ? (cf.pageviews / ga.pageviews).toFixed(1) : '—';
                return (
                  <tr key={date} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-600">{date}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{cf?.requests?.toLocaleString() ?? '—'}</td>
                    <td className="px-4 py-2 text-right font-semibold text-sky-700">{cf?.pageviews?.toLocaleString() ?? '—'}</td>
                    <td className="px-4 py-2 text-right text-slate-500">{cf?.unique_visitors?.toLocaleString() ?? '—'}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{ga?.sessions?.toLocaleString() ?? '—'}</td>
                    <td className="px-4 py-2 text-right text-slate-500">{ga?.users?.toLocaleString() ?? '—'}</td>
                    <td className="px-4 py-2 text-right font-semibold text-orange-600">{ga?.pageviews?.toLocaleString() ?? '—'}</td>
                    <td className="px-4 py-2 text-right text-slate-400">{ratio}x</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
