'use client';
// AN005 — Listing Performance: ranking with actionability flags + per-listing drill.
import { useState, useEffect, useCallback } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';
import { useScope } from '@/lib/scope-context';
import { Section, RangePicker, Spark } from '@/components/CockpitKit';

export default function ListingPerfCockpit() {
  const { unit } = useScope();
  const [range, setRange] = useState(30);
  const [d, setD] = useState<any>(null);
  const [slug, setSlug] = useState('');
  const [detail, setDetail] = useState<any>(null);

  const load = useCallback(async () => {
    const j = await fetch(`/api/bop/an/cockpits?view=listing&tenant_id=${unit.id}&range=${range}`).then(r => r.json());
    setD(j);
  }, [unit.id, range]);
  useEffect(() => { void load(); }, [load]);

  async function openDetail(s: string) {
    setSlug(s); setDetail(null);
    const j = await fetch(`/api/bop/an/cockpits?view=listing&tenant_id=${unit.id}&range=${range}&listing=${encodeURIComponent(s)}`).then(r => r.json());
    setDetail(j);
  }

  return (
    <div className="p-6">
      <ScreenHeader title="Listing Performance" description="Per-listing views/engagement ranking with actionability flags; enter a slug for the daily drill-down" />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <RangePicker value={range} onChange={setRange} />
        <input value={slug} onChange={e => setSlug(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && slug.trim()) void openDetail(slug.trim()); }}
          placeholder="listing slug for drill-down (e.g. 262602-volkswagen-…)"
          className="w-80 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-[11px] focus:outline-none focus:border-indigo-400" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title={`Views ranking (${range}d, from snapshots)`}>
          <div className="space-y-1">
            {(d?.ranking ?? []).map((r: any, i: number) => {
              const ref = r.title.match(/\b(\d{6})\b/)?.[1];
              const contacts = ref ? (d?.contacts?.[ref] ?? 0) : null;
              const flag = r.views >= 15 && contacts === 0;
              return (
                <div key={r.title} className="flex items-center gap-2 text-[11px]">
                  <span className="w-5 text-right text-slate-300">{i + 1}</span>
                  <span className="flex-1 truncate text-slate-600" title={r.title}>{r.title}</span>
                  {flag && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700" title="Views but zero contacts — check price/photos">⚠ no contacts</span>}
                  {contacts !== null && contacts > 0 && <span className="text-[10px] text-emerald-600">{contacts} contact{contacts > 1 ? 's' : ''}</span>}
                  <span className="w-12 text-right font-bold text-slate-700">{r.views}</span>
                </div>
              );
            })}
            {(d?.ranking ?? []).length === 0 && <p className="text-[11px] text-slate-300">No snapshot data yet for this range.</p>}
          </div>
        </Section>

        <Section title={detail ? `Drill-down — ${detail.listing}` : 'Drill-down'}>
          {!detail ? (
            <p className="text-[11px] text-slate-300">Enter a listing slug and press Enter.</p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                {Object.entries(detail.totals ?? {}).map(([k, v]) => (
                  <span key={k} className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1 text-[11px]">
                    <b className="text-slate-700">{String(v)}</b> <span className="text-slate-400">{k}</span>
                  </span>
                ))}
              </div>
              <div className="text-[10px] text-slate-400 mb-1">listing_view per day</div>
              <Spark data={(detail.daily ?? []).map((x: any) => x.listing_view ?? 0)} height={70} color="#3b82f6" />
              <div className="mt-3 max-h-56 overflow-y-auto">
                <table className="w-full text-left text-[10px]">
                  <thead><tr className="text-slate-400"><th className="py-1">date</th><th>views</th><th>shares</th><th>other</th></tr></thead>
                  <tbody>
                    {(detail.daily ?? []).map((x: any) => (
                      <tr key={x.date} className="border-t border-slate-50">
                        <td className="py-1 font-mono">{x.date}</td>
                        <td>{x.listing_view ?? 0}</td>
                        <td>{x.share ?? 0}</td>
                        <td className="text-slate-400">{Object.entries(x).filter(([k]) => !['date', 'listing_view', 'share'].includes(k)).map(([k, v]) => `${k}:${v}`).join(' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Section>
      </div>
    </div>
  );
}
